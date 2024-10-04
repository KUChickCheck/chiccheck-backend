const express = require('express');
const router = express.Router();
const { authenticateTokenAndRole } = require('../Middlewares/authMiddleware');
const { getAllStudents } = require('../Controller/studentController');

router.get('', authenticateTokenAndRole(['admin']), getAllStudents);

module.exports = router;
