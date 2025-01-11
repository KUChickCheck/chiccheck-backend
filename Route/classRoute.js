const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../Middlewares/authMiddleware');
const {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass
} = require('../Controller/classController');

router.post('/', authenticateToken('teacher'), createClass);
router.get('/', authenticateToken('teacher'), getAllClasses);
router.get('/:id', authenticateToken('teacher'), getClassById);
router.put('/:id', authenticateToken('teacher'), updateClass);
router.delete('/:id', authenticateToken('teacher'), deleteClass);

module.exports = router;