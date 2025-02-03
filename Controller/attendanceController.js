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
    consoloe.log(verificationResult)
    if (!verificationResult || !verificationResult.valid) {
      return res.status(400).json({ message: "Face verification failed" });
    }

    // Parse class times
    const classDate = moment(currentTime).format('YYYY-MM-DD');
    const classStartTime = moment(`${classDate} ${classDetails.schedule.start_time}`, 'YYYY-MM-DD HH:mm');
    const classEndTime = moment(`${classDate} ${classDetails.schedule.end_time}`, 'YYYY-MM-DD HH:mm');
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
    const existingAttendance = await Attendance.findOne({
      student_id,
      class_id,
      timestamp: {
        $gte: moment(classDate).startOf('day'),
        $lte: moment(classDate).endOf('day')
      }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: "Attendance already marked for this class today" });
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

exports.getClassAttendanceByDate = async (req, res) => {
  try {
    const { class_id, date } = req.params;

    const startOfDay = moment(date).startOf('day');
    const endOfDay = moment(date).endOf('day');

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

    // Modified to include timestamp
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.student_id._id.toString()] = {
        status: record.status,
        timestamp: record.timestamp
      };
    });

    // Modified to include timestamp in the output
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

    res.status(200).json({
      class_name: classDetails.class_name,
      class_code: classDetails.class_code,
      date: date,
      attendance: attendanceList
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getStudentClassReport = async (req, res) => {
    try {
        const { student_id, class_id } = req.params;

        if (req.user.role === 'student' && req.user.studentId !== student_id) {
            return res.status(403).json({ message: "You can only view your own attendance report" });
        }

        const student = await Student.findById(student_id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const classDetails = await Class.findById(class_id);
        if (!classDetails) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Get all attendance records for this student in this class
        const attendanceRecords = await Attendance.find({
            student_id,
            class_id
        }).lean(); // Add lean() for better performance

        // Calculate total classes first
        const startDate = classDetails.created_at;
        const currentDate = new Date();
        const total_classes = await calculateTotalClasses(classDetails, startDate, currentDate);

        // Initialize report
        const report = {
            total_classes: total_classes,
            ontime: 0,
            late: 0,
            absent: 0
        };

        // Count actual attendance
        attendanceRecords.forEach(record => {
            switch (record.status.toLowerCase()) {
                case 'present':
                    report.ontime++;
                    break;
                case 'late':
                    report.late++;
                    break;
                case 'absent':
                    report.absent++;
                    break;
            }
        });

        // Calculate missing absences
        // If total_classes is more than the sum of all attendance records,
        // the difference should be counted as absences
        const totalRecorded = report.ontime + report.late + report.absent;
        if (report.total_classes > totalRecorded) {
            report.absent += (report.total_classes - totalRecorded);
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

    let totalClasses = 0;
    let currentDay = new Date(startDate);

    while (currentDay <= currentDate) {
        // Get day name in lowercase (e.g., 'monday', 'tuesday', etc.)
        const dayName = currentDay.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

        if (classDays.includes(dayName)) {
            totalClasses++;
        }
        // Move to next day
        currentDay.setDate(currentDay.getDate() + 1);
    }

    return totalClasses;
};