const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../Middlewares/authMiddleware');
const {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
} = require('../Controller/classController');

/**
 * @swagger
 * tags:
 *   - name: Classes
 *     description: Operations related to class management
 */

/**
 * @swagger
 * /api/class:
 *   post:
 *     summary: Create a new class
 *     description: This endpoint allows a teacher to create a new class.
 *     tags: [Classes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               teacherId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Class created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', authenticateToken('teacher'), createClass);

/**
 * @swagger
 * /api/class:
 *   get:
 *     summary: Get all classes
 *     description: This endpoint retrieves a list of all classes.
 *     tags: [Classes]
 *     responses:
 *       200:
 *         description: List of classes
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
 *                   description:
 *                     type: string
 *                   teacherId:
 *                     type: string
 */
router.get('/', authenticateToken('teacher'), getAllClasses);

/**
 * @swagger
 * /api/class/{id}:
 *   get:
 *     summary: Get class by ID
 *     description: This endpoint retrieves a class by its ID.
 *     tags: [Classes]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Class ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Class details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 teacherId:
 *                   type: string
 *       404:
 *         description: Class not found
 */
router.get('/:id', authenticateToken('teacher'), getClassById);

/**
 * @swagger
 * /api/class/{id}:
 *   put:
 *     summary: Update class details
 *     description: This endpoint allows a teacher to update the details of a class.
 *     tags: [Classes]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Class ID
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
 *               description:
 *                 type: string
 *               teacherId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Class updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Class not found
 */
router.put('/:id', authenticateToken('teacher'), updateClass);

/**
 * @swagger
 * /api/class/{id}:
 *   delete:
 *     summary: Delete a class
 *     description: This endpoint allows a teacher to delete a class by its ID.
 *     tags: [Classes]
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Class ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Class deleted successfully
 *       404:
 *         description: Class not found
 */
router.delete('/:id', authenticateToken('teacher'), deleteClass);

module.exports = router;
