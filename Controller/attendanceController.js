const Attendance = require('../Schema/attendanceSchema');
const Class = require('../Schema/classSchema');
const Student = require('../Schema/studentSchema');
const moment = require('moment-timezone');
const Note = require('../Schema/noteSchema');
const axios = require("axios");
require('dotenv').config();

async function verifyFace(student_code, photo) {
  try {
    // Step 1: Get the access token
    const accessTokenResponse = await axios.post(`${process.env.KU_API}/kuedu/api/token/pair`, {
      username: process.env.KU_USERNAME,
      password: process.env.KU_PASSWORD
    });

    const accessToken = accessTokenResponse.data.access;

    // Step 2: Use the access token to pair token
    const response = await axios.post(
      `${process.env.KU_API}/kuedu/api/face/verify`,
      { student_code, photo },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    return response.data; // Return the verification result
  } catch (error) {
    console.error("Error in verifyFace:", error.message);
    throw error.response?.data || new Error("An error occurred during face verification");
  }
}

exports.markAttendance = async (req, res) => {
  try {
    const { student_id, class_id, photo } = req.body;
    const currentTime = new Date();

    if (student_id !== req.user.studentId) {
      return res.status(403).json({
        message: "Access forbidden: You can not mark attendance for others.",
      });
    }

    if (!photo) {
      return res.status(400).json({ message: "photo are required" });
    }

    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const classDetails = await Class.findById(class_id);
    if (!classDetails) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (!student.class_ids.includes(class_id)) {
      return res.status(400).json({ message: "Student is not enrolled in this class" });
    }

    const verificationResult = await verifyFace(student.student_id, photo);
    if (!verificationResult || !verificationResult.match) {
      return res.status(400).json({ message: "Face verification failed" });
    }

    const currentMoment = moment.tz(currentTime, "Asia/Bangkok");
    const today = currentMoment.format('dddd').toLowerCase();
    const classDate = currentMoment.format('YYYY-MM-DD');

    // Find today's schedule
    const todaySchedule = classDetails.schedule.find(schedule => {
      const classDays = schedule.days.toLowerCase().split(',').map(day => day.trim());
      return classDays.includes(today);
    });

    if (!todaySchedule) {
      return res.status(400).json({ message: "No class scheduled for today" });
    }

    const classStartTime = moment.tz(`${classDate} ${todaySchedule.start_time}`, 'YYYY-MM-DD HH:mm', "Asia/Bangkok");
    const classEndTime = moment.tz(`${classDate} ${todaySchedule.end_time}`, 'YYYY-MM-DD HH:mm', "Asia/Bangkok");
    const lateAllowanceTime = moment(classStartTime).add(todaySchedule.late_allowance_minutes, 'minutes');

    let status;
    if (currentMoment.isBefore(lateAllowanceTime)) {
      status = "Present";
    } else if (currentMoment.isBefore(classEndTime)) {
      status = "Late";
    } else {
      status = "Absent";
    }

    const todayStart = moment().tz("Asia/Bangkok").startOf('day');
    const todayEnd = moment().tz("Asia/Bangkok").endOf('day');

    const existingAttendance = await Attendance.findOne({
      student_id,
      class_id,
      timestamp: {
        $gte: todayStart.toDate(),
        $lte: todayEnd.toDate()
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: "Attendance already marked for this class today",
        existing: existingAttendance
      });
    }

    const attendance = new Attendance({
      student_id,
      class_id,
      status,
      timestamp: currentTime
    });

    await attendance.save();

    res.status(201).json({
      message: "Attendance marked successfully",
      attendance: {
        ...attendance.toObject(),
        class_details: {
          name: classDetails.class_name,
          start_time: todaySchedule.start_time,
          end_time: todaySchedule.end_time,
          late_allowance_minutes: todaySchedule.late_allowance_minutes
        }
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getClassAttendance = async (req, res) => {
  try {
    const { class_id } = req.params;
    const attendance = await Attendance.find({ class_id })
      .populate('student_id', 'first_name last_name student_id')
      .sort({ timestamp: -1 });

    res.status(200).json(attendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getStudentAttendance = async (req, res) => {
  try {
    const { student_id } = req.params;
    const attendance = await Attendance.find({ student_id })
      .populate('class_id', 'class_name class_code schedule')
      .sort({ timestamp: -1 });

    res.status(200).json(attendance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.markAbsentForMissingStudents = async (req, res) => {
  try {
    const { class_id, date } = req.body;

    const classDetails = await Class.findById(class_id);
    if (!classDetails) {
      return res.status(404).json({ message: "Class not found" });
    }

    const checkDate = date ? moment(date) : moment();
    const checkDay = checkDate.format('dddd').toLowerCase();

    // Find schedule for this day
    const daySchedule = classDetails.schedule.find(schedule => {
      const classDays = schedule.days.toLowerCase().split(',').map(day => day.trim());
      return classDays.includes(checkDay);
    });

    if (!daySchedule) {
      return res.status(400).json({ message: "No class scheduled for this day" });
    }

    const enrolledStudents = await Student.find({
      class_ids: class_id
    });

    const existingAttendance = await Attendance.find({
      class_id,
      timestamp: {
        $gte: moment(checkDate).startOf('day'),
        $lte: moment(checkDate).endOf('day')
      }
    });

    const studentsWithAttendance = existingAttendance.map(record => record.student_id.toString());
    const absentStudents = enrolledStudents.filter(student =>
      !studentsWithAttendance.includes(student._id.toString())
    );

    const absentRecords = await Promise.all(absentStudents.map(student => {
      const attendance = new Attendance({
        student_id: student._id,
        class_id,
        status: 'Absent',
        timestamp: moment.tz(`${checkDate.format('YYYY-MM-DD')} ${daySchedule.end_time}`, 'YYYY-MM-DD HH:mm', "Asia/Bangkok").toDate()
      });
      return attendance.save();
    }));

    res.status(200).json({
      message: "Absent records created successfully",
      absent_count: absentRecords.length,
      absent_students: absentRecords
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getClassAttendanceByDate = async (req, res) => {
    try {
        const { class_id, date } = req.params;

        // Explicitly set the start and end of day in Bangkok time
        const startOfDay = moment.tz(date, "Asia/Bangkok").startOf('day');
        const endOfDay = moment.tz(date, "Asia/Bangkok").endOf('day');

        const classDetails = await Class.findById(class_id)
            .populate('student_ids', 'first_name last_name student_id');

        if (!classDetails) {
            return res.status(404).json({ message: "Class not found" });
        }

        const attendanceRecords = await Attendance.find({
            class_id,
            timestamp: {
                $gte: startOfDay.toDate(),
                $lte: endOfDay.toDate()
            }
        }).populate('student_id', 'first_name last_name student_id');

        const notes = await Note.find({
            class_id: class_id,
            date: date
        }).populate('student_id', 'first_name last_name student_id').lean();

        const formattedNotes = notes.map(note => ({
            student_id: note.student_id.student_id,
            first_name: note.student_id.first_name,
            last_name: note.student_id.last_name,
            note_text: note.note_text,
            timestamp: moment.tz(note.timestamp, "Asia/Bangkok").format('YYYY-MM-DD HH:mm:ss')
        }));

        const attendanceMap = {};
        attendanceRecords.forEach(record => {
            attendanceMap[record.student_id._id.toString()] = {
                status: record.status,
                // Explicitly convert UTC to Bangkok time
                timestamp: moment.tz(record.timestamp, "Asia/Bangkok").format('YYYY-MM-DD HH:mm:ss')
            };
        });

        const attendanceList = classDetails.student_ids.map(student => {
            const attendanceInfo = attendanceMap[student._id.toString()] || {
                status: 'Absent',
                timestamp: null
            };

            return {
                student_id: student.student_id,
                first_name: student.first_name,
                last_name: student.last_name,
                status: attendanceInfo.status,
                timestamp: attendanceInfo.timestamp
            };
        });

        const stats = {
            total_students: classDetails.student_ids.length,
            ontime: attendanceList.filter(a => a.status === 'Present').length,
            late: attendanceList.filter(a => a.status === 'Late').length,
            absent: attendanceList.filter(a => a.status === 'Absent').length
        };

        res.status(200).json({
            class_name: classDetails.class_name,
            class_code: classDetails.class_code,
            date: moment.tz(date, "Asia/Bangkok").format('YYYY-MM-DD'),
            statistics: stats,
            attendance: attendanceList,
            notes: formattedNotes
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


exports.getStudentClassReport = async (req, res) => {
    try {
        const { student_id, class_id } = req.params;

        const student = await Student.findById(student_id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const classDetails = await Class.findById(class_id);
        if (!classDetails) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Calculate total classes first
        const startDate = classDetails.created_at;
        const currentDate = new Date();
        const total_classes = await calculateTotalClasses(classDetails, startDate, currentDate);

        // Get all attendance records for this student in this class
        const attendanceRecords = await Attendance.find({
            student_id,
            class_id
        }).lean();

        // Initialize report
        const report = {
            total_classes: total_classes,
            ontime: 0,
            late: 0,
            absent: 0
        };

        // Count actual attendance records
        attendanceRecords.forEach(record => {
            switch (record.status) {
                case 'Present':
                    report.ontime++;
                    break;
                case 'Late':
                    report.late++;
                    break;
                case 'Absent':
                    report.absent++;
                    break;
            }
        });

        // If no attendance record found for today's class, mark as absent
        if (report.ontime + report.late + report.absent < total_classes) {
            report.absent = total_classes - (report.ontime + report.late);
        }

        res.status(200).json({
            class_name: classDetails.class_name,
            report: report
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


// Helper function to calculate total classes
const calculateTotalClasses = async (classDetails, startDate, currentDate) => {
    const currentMoment = moment().tz("Asia/Bangkok");
    let totalClasses = 0;
    let currentDay = moment(startDate).tz("Asia/Bangkok").startOf('day');

    while (currentDay.isSameOrBefore(currentMoment, 'day')) {
        const dayName = currentDay.format('dddd').toLowerCase();

        // Check each schedule
        classDetails.schedule.forEach(schedule => {
            const classDays = schedule.days.toLowerCase().split(',').map(day => day.trim());
            if (classDays.includes(dayName)) {
                const classStartTime = moment.tz(
                    `${currentDay.format('YYYY-MM-DD')} ${schedule.start_time}`,
                    'YYYY-MM-DD HH:mm',
                    "Asia/Bangkok"
                );

                if (classStartTime.isBefore(currentMoment)) {
                    totalClasses++;
                }
            }
        });

        currentDay.add(1, 'day');
    }

    return totalClasses;
};

exports.submitAttendanceNote = async (req, res) => {
    try {
        const { student_id, class_id, date, note_text } = req.body;

        if (student_id !== req.user.studentId) {
            return res.status(403).json({ message: "You can only submit notes for yourself" });
        }

        const student = await Student.findById(student_id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const classDetails = await Class.findById(class_id);
        if (!classDetails) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Create current time in Bangkok timezone
        const bangkokTime = moment().tz("Asia/Bangkok").format('YYYY-MM-DD HH:mm:ss');

        const newNote = new Note({
            student_id,
            class_id,
            date: date,
            note_text,
            timestamp: bangkokTime
        });

        await newNote.save();

        res.status(201).json({
            message: "Note submitted successfully",
            note: {
                ...newNote.toObject(),
                class_name: classDetails.class_name,
                timestamp: moment.tz(newNote.timestamp, "Asia/Bangkok").format('YYYY-MM-DD HH:mm:ss')
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};