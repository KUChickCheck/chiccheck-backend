const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../Middlewares/authMiddleware');
const {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignToClass,
  removeFromClass,
  getTeacherClasses
} = require('../Controller/teacherController');

/**
 * @swagger
 * /api/teacher:
 *   get:
 *     summary: Get all teachers
 *     description: This endpoint retrieves a list of all teachers.
 *     tags:
 *       - Teachers
 *     responses:
 *       200:
 *         description: List of teachers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 */
router.get('/', authenticateToken('teacher'), getAllTeachers);

/**
 * @swagger
 * /api/teacher/{id}:
 *   get:
 *     summary: Get teacher by ID
 *     description: This endpoint retrieves a teacher's details by their ID.
 *     tags:
 *       - Teachers
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Teacher's ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Teacher details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *       404:
 *         description: Teacher not found
 */
router.get('/:id', authenticateToken('teacher'), getTeacherById);

/**
 * @swagger
 * /api/teacher:
 *   post:
 *     summary: Create a new teacher
 *     description: This endpoint allows the creation of a new teacher.
 *     tags:
 *       - Teachers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Teacher created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', authenticateToken('teacher'), createTeacher);

/**
 * @swagger
 * /api/teacher/{id}:
 *   put:
 *     summary: Update teacher details
 *     description: This endpoint updates the details of an existing teacher.
 *     tags:
 *       - Teachers
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Teacher's ID
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
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Teacher updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Teacher not found
 */
router.put('/:id', authenticateToken('teacher'), updateTeacher);

/**
 * @swagger
 * /api/teacher/{id}:
 *   delete:
 *     summary: Delete a teacher
 *     description: This endpoint deletes a teacher by their ID.
 *     tags:
 *       - Teachers
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Teacher's ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Teacher deleted successfully
 *       404:
 *         description: Teacher not found
 */
router.delete('/:id', authenticateToken('teacher'), deleteTeacher);

/**
 * @swagger
 * /api/teacher/{id}/assign-class:
 *   post:
 *     summary: Assign teacher to class
 *     description: This endpoint assigns a teacher to a class.
 *     tags:
 *       - Teachers
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Teacher's ID
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
 *               classId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Teacher assigned to class successfully
 *       400:
 *         description: Invalid class or teacher ID
 *       404:
 *         description: Teacher or class not found
 */
router.post('/:id/assign-class', authenticateToken('teacher'), assignToClass);

/**
 * @swagger
 * /api/teacher/{id}/remove-class:
 *   post:
 *     summary: Remove teacher from class
 *     description: This endpoint removes a teacher from a class.
 *     tags:
 *       - Teachers
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Teacher's ID
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
 *               classId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Teacher removed from class successfully
 *       400:
 *         description: Invalid class or teacher ID
 *       404:
 *         description: Teacher or class not found
 */
router.post('/:id/remove-class', authenticateToken('teacher'), removeFromClass);

router.get('/:id/all-classes', authenticateToken('teacher'), getTeacherClasses);

module.exports = router;
