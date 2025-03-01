const Attendance = require('../Schema/attendanceSchema');
const Class = require('../Schema/classSchema');
const Student = require('../Schema/studentSchema');
const moment = require('moment-timezone');
const Note = require('../Schema/noteSchema');
const axios = require("axios");
require('dotenv').config();

async function verifyFace(student_code, photo) {
  try {
    const student = await Student.find({student_id: student_code})

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
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
    const { student_id, class_id, photo, latitude, longitude } = req.body;
    const currentTime = new Date();

    if (student_id !== req.user.studentId) {
      return res.status(403).json({
        message: "Access forbidden: You can not mark attendance for others.",
      });
    }

    if (!photo) {
      return res.status(400).json({ message: "photo is required" });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "Location data is required" });
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
      timestamp: currentTime,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      }
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

        // Convert date range to match MongoDB's ISO date format
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

        // Modified notes query to match ISO date string pattern
        const notes = await Note.find({
            class_id: class_id,
            $or: [
                // Match the date part of the ISO string
                { date: { $regex: `^${date}` } },
                // Also try with timestamp field
                { timestamp: {
                    $gte: startOfDay.toDate(),
                    $lte: endOfDay.toDate()
                }}
            ]
        }).populate('student_id', 'first_name last_name student_id').lean();

        console.log("Query parameters:", {
            class_id,
            date,
            dateRegex: `^${date}`,
            startDay: startOfDay.format(),
            endDay: endOfDay.format()
        });
        console.log("Found notes raw:", await Note.find({ class_id: class_id }).lean());
        console.log("Found notes after filter:", notes);

        // Calculate location outliers - only if we have multiple attendance records with location data
        const recordsWithLocation = attendanceRecords.filter(record =>
            record.location && record.location.latitude && record.location.longitude
        );

        // Initialize location status map
        const locationStatusMap = {};

        // Perform pairwise outlier detection if we have enough data points
        if (recordsWithLocation.length >= 2) {
            const threshold = 50; // 50 meters
            const outlierThresholdPercent = 0.5; // 50% of students must be within range to be considered normal

            // For each student, check distance to all other students
            recordsWithLocation.forEach(record => {
                const studentId = record.student_id._id.toString();

                // Count how many other students are within the threshold distance
                let studentsWithinThreshold = 0;

                recordsWithLocation.forEach(otherRecord => {
                    if (record.student_id._id.toString() !== otherRecord.student_id._id.toString()) {
                        const distance = calculateDistance(
                            record.location.latitude,
                            record.location.longitude,
                            otherRecord.location.latitude,
                            otherRecord.location.longitude
                        );

                        if (distance <= threshold) {
                            studentsWithinThreshold++;
                        }
                    }
                });

                // Calculate percentage of students within threshold
                const totalOtherStudents = recordsWithLocation.length - 1;
                const percentWithinThreshold = totalOtherStudents > 0
                    ? studentsWithinThreshold / totalOtherStudents
                    : 1; // If there's only one student, they're not an outlier

                // Determine if this student is an outlier
                const isOutlier = percentWithinThreshold < outlierThresholdPercent;

                locationStatusMap[studentId] = {
                    is_outlier: isOutlier,
                    students_within_threshold: studentsWithinThreshold,
                    total_other_students: totalOtherStudents,
                    percent_within_threshold: percentWithinThreshold,
                    location_status: isOutlier ? 'Outlier' : 'Normal'
                };
            });
        }

        const formattedNotes = notes.map(note => ({
            student_id: note.student_id.student_id,
            first_name: note.student_id.first_name,
            last_name: note.student_id.last_name,
            note_text: note.note_text,
            timestamp: moment(note.timestamp).tz("Asia/Bangkok").format('YYYY-MM-DD HH:mm:ss')
        }));

        const attendanceMap = {};
        attendanceRecords.forEach(record => {
            const studentId = record.student_id._id.toString();
            attendanceMap[studentId] = {
                status: record.status,
                timestamp: moment(record.timestamp).tz("Asia/Bangkok").format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
                location: record.location || null,
                location_status: locationStatusMap[studentId] ? locationStatusMap[studentId].location_status : 'Unknown'
            };
        });

        const attendanceList = classDetails.student_ids.map(student => {
            const studentId = student._id.toString();
            const attendanceInfo = attendanceMap[studentId] || {
                status: 'Absent',
                timestamp: null,
                location: null,
                location_status: 'Unknown'
            };

            return {
                student_id: student.student_id,
                first_name: student.first_name,
                last_name: student.last_name,
                status: attendanceInfo.status,
                timestamp: attendanceInfo.timestamp,
                location: attendanceInfo.location,
                location_status: attendanceInfo.location_status
            };
        });

        // Sort attendanceList by student_id numerically
        attendanceList.sort((a, b) => {
            const idA = parseInt(a.student_id.replace(/\D/g, ''), 10) || 0;
            const idB = parseInt(b.student_id.replace(/\D/g, ''), 10) || 0;
            return idA - idB;
        });

        const stats = {
            total_students: classDetails.student_ids.length,
            ontime: attendanceList.filter(a => a.status === 'Present').length,
            late: attendanceList.filter(a => a.status === 'Late').length,
            absent: attendanceList.filter(a => a.status === 'Absent').length,
            location_outliers: Object.values(locationStatusMap).filter(status => status.is_outlier).length || 0
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

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance * 1000; // Convert to meters
}


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
        const bangkokTime = moment().tz("Asia/Bangkok").format(); // This will create ISO format

        const newNote = new Note({
            student_id,
            class_id,
            date: date,
            note_text,
            timestamp: new Date()  // Now storing as Date object
        });

        await newNote.save();

        res.status(201).json({
            message: "Note submitted successfully",
            note: {
                ...newNote.toObject(),
                class_name: classDetails.class_name,
                timestamp: moment(newNote.timestamp).tz("Asia/Bangkok").format('YYYY-MM-DD HH:mm:ss')
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.detectLocationOutliers = async (req, res) => {
  try {
    const { class_id, date } = req.params;

    // Get the date range for the class session
    const startOfDay = moment.tz(date, "Asia/Bangkok").startOf('day');
    const endOfDay = moment.tz(date, "Asia/Bangkok").endOf('day');

    // Find all attendance records for this class on this date
    const attendanceRecords = await Attendance.find({
      class_id,
      timestamp: {
        $gte: startOfDay.toDate(),
        $lte: endOfDay.toDate()
      },
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true }
    }).populate('student_id', 'first_name last_name student_id');

    if (attendanceRecords.length < 3) {
      return res.status(400).json({
        message: "Not enough attendance records to detect outliers",
        attendanceRecords
      });
    }

    // Calculate the mean center of all locations
    const locationSum = attendanceRecords.reduce((sum, record) => {
      return {
        latitude: sum.latitude + record.location.latitude,
        longitude: sum.longitude + record.location.longitude
      };
    }, { latitude: 0, longitude: 0 });

    const meanCenter = {
      latitude: locationSum.latitude / attendanceRecords.length,
      longitude: locationSum.longitude / attendanceRecords.length
    };

    // Calculate the distance of each location from the mean center
    const recordsWithDistance = attendanceRecords.map(record => {
      const distance = calculateDistance(
        record.location.latitude,
        record.location.longitude,
        meanCenter.latitude,
        meanCenter.longitude
      );

      return {
        ...record.toObject(),
        distance
      };
    });

    // Calculate standard deviation of distances
    const distances = recordsWithDistance.map(r => r.distance);
    const meanDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const squaredDifferences = distances.map(d => Math.pow(d - meanDistance, 2));
    const variance = squaredDifferences.reduce((sum, sq) => sum + sq, 0) / distances.length;
    const stdDev = Math.sqrt(variance);

    // Mark outliers (locations more than 2 standard deviations from mean)
    const outlierThreshold = meanDistance + (2 * stdDev);
    const resultsWithOutlierStatus = recordsWithDistance.map(record => {
      return {
        student_id: record.student_id._id,
        student_name: `${record.student_id.first_name} ${record.student_id.last_name}`,
        student_code: record.student_id.student_id,
        location: record.location,
        distance_from_center: record.distance,
        is_outlier: record.distance > outlierThreshold
      };
    });

    // Count outliers
    const outlierCount = resultsWithOutlierStatus.filter(r => r.is_outlier).length;

    // Update attendance records to mark outliers
    for (const record of resultsWithOutlierStatus) {
      if (record.is_outlier) {
        await Attendance.findOneAndUpdate(
          {
            student_id: record.student_id,
            class_id,
            timestamp: {
              $gte: startOfDay.toDate(),
              $lte: endOfDay.toDate()
            }
          },
          { $set: { location_status: 'Outlier' } }
        );
      } else {
        await Attendance.findOneAndUpdate(
          {
            student_id: record.student_id,
            class_id,
            timestamp: {
              $gte: startOfDay.toDate(),
              $lte: endOfDay.toDate()
            }
          },
          { $set: { location_status: 'Normal' } }
        );
      }
    }

    res.status(200).json({
      message: "Location outlier detection completed",
      date,
      class_id,
      mean_center: meanCenter,
      outlier_threshold: outlierThreshold,
      outlier_count: outlierCount,
      total_students: attendanceRecords.length,
      results: resultsWithOutlierStatus
    });

  } catch (err) {
    console.error("Error detecting location outliers:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

