const express = require('express');
const router = express.Router();
const { authenticateTokenAndRole } = require('../Middlewares/authMiddleware');
const {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} = require('../Controller/studentController');

// GET all students
router.get('/', authenticateTokenAndRole(['admin']), getAllStudents);

// GET a single student by ID
router.get('/:id', authenticateTokenAndRole(['admin', 'teacher']), getStudentById);

// POST a new student
router.post('/', authenticateTokenAndRole(['admin']), createStudent);

// PUT update an existing student by ID
router.put('/:id', authenticateTokenAndRole(['admin']), updateStudent);

// DELETE a student by ID
router.delete('/:id', authenticateTokenAndRole(['admin']), deleteStudent);

module.exports = router;
