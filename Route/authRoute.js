const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const {
  registerStudent,
  loginStudent,
  registerTeacher,
  loginTeacher
} = require('../Controller/authController');
const jsonParser = bodyParser.json();

// Student routes
router.post('/student/register', jsonParser, registerStudent);
router.post('/student/login', jsonParser, loginStudent);

// Teacher routes
router.post('/teacher/register', jsonParser, registerTeacher);
router.post('/teacher/login', jsonParser, loginTeacher);

module.exports = router;