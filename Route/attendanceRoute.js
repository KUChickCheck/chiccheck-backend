const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../Middlewares/authMiddleware');
const {
  markAttendance,
  getClassAttendance,
  getStudentAttendance,
  markAbsentForMissingStudents,
  getClassAttendanceByDate

} = require('../Controller/attendanceController');

// Mark attendance
router.post('/', authenticateToken('student'), markAttendance);

// Get attendance for a class
router.get('/class/:class_id', authenticateToken('teacher'), getClassAttendance);

// Get attendance for a student
router.get('/student/:student_id', authenticateToken('student'), getStudentAttendance);

router.post('/mark-absent', authenticateToken('teacher'), markAbsentForMissingStudents);

// Get attendance for a specific class on a specific date
router.get('/class/:class_id/date/:date', authenticateToken('teacher'), getClassAttendanceByDate);

module.exports = router;