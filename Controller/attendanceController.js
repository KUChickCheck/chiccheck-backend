const Attendance = require('../Schema/attendanceSchema');
const Class = require('../Schema/classSchema');
const Student = require('../Schema/studentSchema');
const moment = require('moment-timezone');

exports.markAttendance = async (req, res) => {
  try {
    const { student_id, class_id, photo } = req.body;
    const currentTime = new Date();

    // if (!photo) {
    //   return res.status(400).json({ message: "photo are required" });
    // }

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

    // const verificationResult = await verifyFace(student.student_id, photo);
    // if (!verificationResult || !verificationResult.valid) {
    //   return res.status(400).json({ message: "Face verification failed" });
    // }

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
      return res.status(400).json({ message: "No class scheduled for today", today: today, class_day: classDays });
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