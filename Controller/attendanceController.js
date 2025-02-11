const Attendance = require('../Schema/attendanceSchema');
const Class = require('../Schema/classSchema');
const Student = require('../Schema/studentSchema');
const moment = require('moment-timezone');
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
      return res
        .status(403)
        .json({
          message: "Access forbidden: You can not mark attendance for others.",
        });
    }

    if (!photo) {
      return res.status(400).json({ message: "photo are required" });
    }

    // Check if student exists
    const student = await Student.findById(student_id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Check if class exists and get its schedule
    const classDetails = await Class.findById(class_id);
    if (!classDetails) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if student is enrolled in this class
    if (!student.class_ids.includes(class_id)) {
      return res.status(400).json({ message: "Student is not enrolled in this class" });
    }

    const verificationResult = await verifyFace(student.student_id, photo);
    if (!verificationResult || !verificationResult.match) {
      return res.status(400).json({ message: "Face verification failed" });
    }

    // Parse class times
    const classDate = moment(currentTime).tz("Asia/Bangkok").format('YYYY-MM-DD');
    const classStartTime = moment.tz(`${classDate} ${classDetails.schedule.start_time}`, 'YYYY-MM-DD HH:mm', "Asia/Bangkok");
    const classEndTime = moment.tz(`${classDate} ${classDetails.schedule.end_time}`, 'YYYY-MM-DD HH:mm', "Asia/Bangkok");
    const lateAllowanceTime = moment(classStartTime).add(classDetails.schedule.late_allowance_minutes, 'minutes');
    const currentMoment = moment.tz(currentTime, "Asia/Bangkok");

    // Check if today is a class day
    const classDays = classDetails.schedule.days.split(',').map(day => day.trim().toLowerCase());
    const today = currentMoment.format('dddd').toLowerCase();
    if (!classDays.includes(today)) {
      return res.status(400).json({ message: "No class scheduled for today" });
    }

    // Determine attendance status based on time
    let status;
    if (currentMoment.isBefore(lateAllowanceTime)) {
      status = "Present";
    } else if (currentMoment.isBefore(classEndTime)) {
      status = "Late";
    } else {
      status = "Absent";
    }

    // Check for existing attendance record
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

    // Create attendance record
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
          start_time: classDetails.schedule.start_time,
          end_time: classDetails.schedule.end_time,
          late_allowance_minutes: classDetails.schedule.late_allowance_minutes
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

    // Get class details
    const classDetails = await Class.findById(class_id);
    if (!classDetails) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Get the specified date or use current date
    const checkDate = date ? moment(date) : moment();

    // Check if this was a class day
    const classDays = classDetails.schedule.days.split(',').map(day => day.trim().toLowerCase());
    const checkDay = checkDate.format('dddd').toLowerCase();
    if (!classDays.includes(checkDay)) {
      return res.status(400).json({ message: "No class scheduled for this day" });
    }

    // Get all students enrolled in this class
    const enrolledStudents = await Student.find({
      class_ids: class_id
    });

    // Get all attendance records for this class on this date
    const existingAttendance = await Attendance.find({
      class_id,
      timestamp: {
        $gte: moment(checkDate).startOf('day'),
        $lte: moment(checkDate).endOf('day')
      }
    });

    // Find students who haven't marked attendance
    const studentsWithAttendance = existingAttendance.map(record => record.student_id.toString());
    const absentStudents = enrolledStudents.filter(student =>
      !studentsWithAttendance.includes(student._id.toString())
    );

    // Mark absent for students who haven't marked attendance
    const absentRecords = await Promise.all(absentStudents.map(student => {
      const attendance = new Attendance({
        student_id: student._id,
        class_id,
        status: 'Absent',
        timestamp: moment(`${checkDate.format('YYYY-MM-DD')} ${classDetails.schedule.end_time}`, 'YYYY-MM-DD HH:mm').toDate()
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

exports.getStudentClassesByDate = async (req, res) => {
    try {
        const { student_id, day } = req.params;

        const student = await Student.findById(student_id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const classes = await Class.find({
            _id: { $in: student.class_ids },
            'schedule.days': { $regex: day, $options: 'i' }
        })
        .populate('teacher_ids', 'first_name last_name')
        .populate('student_ids')
        .lean();

        const today = moment().tz("Asia/Bangkok").format('YYYY-MM-DD');
        const attendanceRecords = await Attendance.find({
            student_id: student_id,
            class_id: { $in: classes.map(c => c._id) },
            timestamp: {
                $gte: moment(today).tz("Asia/Bangkok").startOf('day'),
                $lte: moment(today).tz("Asia/Bangkok").endOf('day')
            }
        }).lean();

        const allClassAttendance = await Promise.all(classes.map(async (classItem) => {
            const classAttendance = await Attendance.find({
                class_id: classItem._id,
                timestamp: {
                    $gte: moment(today).tz("Asia/Bangkok").startOf('day'),
                    $lte: moment(today).tz("Asia/Bangkok").endOf('day')
                }
            }).lean();
            return {
                class_id: classItem._id,
                attendance: classAttendance
            };
        }));

        const attendanceMap = {};
        attendanceRecords.forEach(record => {
            attendanceMap[record.class_id.toString()] = record.status;
        });

        let classesWithStatus = classes.map(classItem => {
            const classStats = allClassAttendance
                .find(ca => ca.class_id.toString() === classItem._id.toString())
                ?.attendance || [];

            const stats = {
                total_students: classItem.student_ids.length,
                ontime: classStats.filter(a => a.status === 'Present').length,
                late: classStats.filter(a => a.status === 'Late').length,
                absent: classStats.filter(a => a.status === 'Absent').length
            };

            return {
                class_name: classItem.class_name,
                class_id: classItem._id,
                teachers: classItem.teacher_ids.map(teacher => ({
                    id: teacher._id,
                    name: `${teacher.first_name} ${teacher.last_name}`
                })),
                schedule: classItem.schedule,
                status: attendanceMap[classItem._id.toString()] || 'Not checked',
                statistics: stats
            };
        });

        classesWithStatus.sort((a, b) => {
            const aChecked = a.status !== 'Not checked';
            const bChecked = b.status !== 'Not checked';

            if (aChecked === bChecked) {
                return a.schedule.start_time.localeCompare(b.schedule.start_time);
            }
            return aChecked ? 1 : -1;
        });

        res.status(200).json(classesWithStatus);

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
    const classDays = classDetails.schedule.days.toLowerCase().split(',').map(day => day.trim());
    const currentMoment = moment().tz("Asia/Bangkok");

    let totalClasses = 0;
    let currentDay = moment(startDate).tz("Asia/Bangkok").startOf('day');

    while (currentDay.isSameOrBefore(currentMoment, 'day')) {
        const dayName = currentDay.format('dddd').toLowerCase();

        if (classDays.includes(dayName)) {
            // Create class start time for this day
            const classStartTime = moment.tz(
                `${currentDay.format('YYYY-MM-DD')} ${classDetails.schedule.start_time}`,
                'YYYY-MM-DD HH:mm',
                "Asia/Bangkok"
            );

            // Only count if class start time has passed
            if (classStartTime.isBefore(currentMoment)) {
                totalClasses++;
            }
        }
        currentDay.add(1, 'day');
    }

    return totalClasses;
};