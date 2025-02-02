const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../Middlewares/authMiddleware');
const {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  registerClass,
  unregisterClass,
  registerClassByClassCode,
  unregisterClassByClassCode,
  getStudentEnrollClasses
} = require('../Controller/studentController');

/**
 * @swagger
 * tags:
 *   - name: Students
 *     description: Operations related to students
 */

/**
 * @swagger
 * /api/student:
 *   get:
 *     summary: Get all students
 *     description: This endpoint retrieves a list of all students.
 *     tags: [Students]
 *     responses:
 *       200:
 *         description: List of students
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   student_id:
 *                     type: string
 *                   first_name:
 *                     type: string
 *                   last_name:
 *                     type: string
 *                   email:
 *                     type: string
 */
router.get('/', authenticateToken('teacher'), getAllStudents);

/**
 * @swagger
 * /api/student/{id}:
 *   get:
 *     summary: Get student by ID
 *     description: This endpoint retrieves a student's details by their ID.
 *     tags: [Students]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Student's ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 student_id:
 *                   type: string
 *                 first_name:
 *                   type: string
 *                 last_name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 class_ids:
 *                   type: array
 *                   items:
 *                     type: string
 *       404:
 *         description: Student not found
 */
router.get('/:id', authenticateToken('student'), getStudentById);

router.get('/enrolled/:id', authenticateToken('student'), getStudentEnrollClasses);

/**
 * @swagger
 * /api/student:
 *   post:
 *     summary: Create a new student
 *     description: This endpoint allows the creation of a new student.
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', authenticateToken('teacher'), createStudent);

/**
 * @swagger
 * /api/student/{id}:
 *   put:
 *     summary: Update student details
 *     description: This endpoint updates the details of an existing student.
 *     tags: [Students]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Student's ID
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Student not found
 */
router.put('/:id', authenticateToken('teacher'), updateStudent);

/**
 * @swagger
 * /api/student/{id}:
 *   delete:
 *     summary: Delete a student
 *     description: This endpoint deletes a student by their ID.
 *     tags: [Students]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Student's ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student deleted successfully
 *       404:
 *         description: Student not found
 */
router.delete('/:id', authenticateToken('teacher'), deleteStudent);

/**
 * @swagger
 * /api/student/{id}/register-class:
 *   post:
 *     summary: Register student to class
 *     description: This endpoint allows a student to register for a class.
 *     tags: [Students]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Student's ID
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               class_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Student registered to class successfully
 *       404:
 *         description: Class or student not found
 */
router.post('/:id/register-class', authenticateToken('student'), registerClass);

/**
 * @swagger
 * /api/student/{id}/unregister-class:
 *   post:
 *     summary: Unregister student from class
 *     description: This endpoint allows a student to unregister from a class.
 *     tags: [Students]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Student's ID
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               class_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Student unregistered from class successfully
 *       404:
 *         description: Class or student not found
 */
router.post('/:id/unregister-class', authenticateToken('student'), unregisterClass);

/**
 * @swagger
 * /api/student/{id}/enroll:
 *   post:
 *     summary: Register student to class
 *     description: This endpoint allows a student to register for a class.
 *     tags: [Students]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Student's ID
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               class_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Student registered to class successfully
 *       404:
 *         description: Class or student not found
 */

router.post('/:id/enroll', authenticateToken('student'), registerClassByClassCode);
/**
 * @swagger
 * /api/student/{id}/unenroll:
 *   post:
 *     summary: Unregister student from class
 *     description: This endpoint allows a student to unregister from a class.
 *     tags: [Students]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Student's ID
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               class_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Student unregistered from class successfully
 *       404:
 *         description: Class or student not found
 */
router.post('/:id/unenroll', authenticateToken('student'), unregisterClassByClassCode);

module.exports = router;
