const express = require('express');
const router = express.Router();
const { authenticateTokenAndRole } = require('../Middlewares/authMiddleware');
const {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
} = require('../Controller/teacherController');

// GET all teachers
router.get('/', authenticateTokenAndRole(['admin']), getAllTeachers);

// GET a single teacher by ID
router.get('/:id', authenticateTokenAndRole(['admin', 'teacher']), getTeacherById);

// POST a new teacher
router.post('/', authenticateTokenAndRole(['admin']), createTeacher);

// PUT update an existing teacher by ID
router.put('/:id', authenticateTokenAndRole(['admin']), updateTeacher);

// DELETE a teacher by ID
router.delete('/:id', authenticateTokenAndRole(['admin']), deleteTeacher);

module.exports = router;
