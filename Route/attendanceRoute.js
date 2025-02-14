const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../Middlewares/authMiddleware');
const {
  markAttendance,
  getClassAttendance,
  getStudentAttendance,
  markAbsentForMissingStudents,
  getClassAttendanceByDate,
  getStudentClassReport,
  submitAttendanceNote,
} = require('../Controller/attendanceController');

/**
 * @swagger
 * tags:
 *   - name: Attendance
 *     description: Operations related to attendance management
 */

/**
 * @swagger
 * /api/attendance:
 *   post:
 *     summary: Mark attendance for a student
 *     description: This endpoint allows a student to mark their attendance.
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               classId:
 *                 type: string
 *               studentId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [present, absent]
 *     responses:
 *       200:
 *         description: Attendance marked successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', authenticateToken('student'), markAttendance);

/**
 * @swagger
 * /api/attendance/class/{class_id}:
 *   get:
 *     summary: Get attendance for a class
 *     description: This endpoint retrieves the attendance for a specific class.
 *     tags: [Attendance]
 *     parameters:
 *       - name: class_id
 *         in: path
 *         description: The class ID to retrieve attendance for
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of attendance records for the class
 *       404:
 *         description: Class not found
 */
router.get('/class/:class_id', authenticateToken('teacher'), getClassAttendance);

/**
 * @swagger
 * /api/attendance/student/{student_id}:
 *   get:
 *     summary: Get attendance for a student
 *     description: This endpoint retrieves the attendance for a specific student.
 *     tags: [Attendance]
 *     parameters:
 *       - name: student_id
 *         in: path
 *         description: The student ID to retrieve attendance for
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student attendance records
 *       404:
 *         description: Student not found
 */
router.get('/student/:student_id', authenticateToken('student'), getStudentAttendance);

/**
 * @swagger
 * /api/attendance/mark-absent:
 *   post:
 *     summary: Mark absent for missing students
 *     description: This endpoint allows a teacher to mark students as absent if they are missing from the class.
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               classId:
 *                 type: string
 *               date:
 *                 type: string
 *     responses:
 *       200:
 *         description: Students marked as absent successfully
 *       404:
 *         description: Class or students not found
 */
router.post('/mark-absent', authenticateToken('teacher'), markAbsentForMissingStudents);

/**
 * @swagger
 * /api/attendance/class/{class_id}/date/{date}:
 *   get:
 *     summary: Get attendance for a specific class on a specific date
 *     description: This endpoint retrieves the attendance for a specific class on a specific date.
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: class_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The class ID to retrieve attendance for
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *         description: Date in YYYY-MM-DD format
 */
router.get('/class/:class_id/date/:date', authenticateToken('teacher'), getClassAttendanceByDate);

/**
 * @swagger
 * /api/attendance/report/{student_id}/{class_id}:
 *   get:
 *     summary: Get attendance report summary for a student in a specific class
 *     description: This endpoint retrieves attendance statistics including total classes, ontime, late, and absent counts. Accessible by both teachers and the student themselves.
 *     tags: [Attendance]
 *     parameters:
 *       - name: student_id
 *         in: path
 *         description: The student ID to get report for
 *         required: true
 *         schema:
 *           type: string
 *       - name: class_id
 *         in: path
 *         description: The class ID to get report for
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student's attendance report summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 class_name:
 *                   type: string
 *                 report:
 *                   type: object
 *                   properties:
 *                     total_classes:
 *                       type: number
 *                     ontime:
 *                       type: number
 *                     late:
 *                       type: number
 *                     absent:
 *                       type: number
 *       404:
 *         description: Student or class not found
 */
router.get('/report/:student_id/:class_id', authenticateToken(['teacher', 'student']), getStudentClassReport);

/**
 * @swagger
 * /api/attendance/note:
 *   post:
 *     summary: Submit attendance note
 *     description: This endpoint allows a student to submit a note for a class.
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               student_id:
 *                 type: string
 *                 description: MongoDB ObjectId of the student
 *               class_id:
 *                 type: string
 *                 description: MongoDB ObjectId of the class
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date for the note (YYYY-MM-DD)
 *               note_text:
 *                 type: string
 *                 description: Content of the note
 *     responses:
 *       201:
 *         description: Note submitted successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Unauthorized note submission
 *       404:
 *         description: Student or class not found
 */
router.post('/note', authenticateToken('student'), submitAttendanceNote);

module.exports = router;
