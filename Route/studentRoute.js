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
  unregisterClass
} = require('../Controller/studentController');

router.get('/', authenticateToken('teacher'), getAllStudents);
router.get('/:id', authenticateToken('student'), getStudentById);
router.post('/', authenticateToken('teacher'), createStudent);
router.put('/:id', authenticateToken('teacher'), updateStudent);
router.delete('/:id', authenticateToken('teacher'), deleteStudent);

router.post('/:id/register-class', authenticateToken('student'), registerClass);
router.post('/:id/unregister-class', authenticateToken('student'), unregisterClass);

module.exports = router;