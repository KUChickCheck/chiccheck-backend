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
  removeFromClass
} = require('../Controller/teacherController');

router.get('/', authenticateToken('teacher'), getAllTeachers);
router.get('/:id', authenticateToken('teacher'), getTeacherById);
router.post('/', authenticateToken('teacher'), createTeacher);
router.put('/:id', authenticateToken('teacher'), updateTeacher);
router.delete('/:id', authenticateToken('teacher'), deleteTeacher);

// Class assignment routes
router.post('/:id/assign-class', authenticateToken('teacher'), assignToClass);
router.post('/:id/remove-class', authenticateToken('teacher'), removeFromClass);

module.exports = router;