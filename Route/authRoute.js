const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { registerUser, loginUser, registerCourse, getAllStudents, getStudentByUsername } = require('../Controller/authController');
const { verifyCookieToken } = require('../Middlewares/authMiddleware');
const jsonParser = bodyParser.json();

// POST Method /register
router.post('/register', jsonParser, registerUser);

// POST Method /login
router.post('/login', jsonParser, loginUser);

// POST Method /register-course
router.post('/register-course', jsonParser, verifyCookieToken, registerCourse);

// GET Method /students
router.get('/students', getAllStudents);

// GET Method /student/:username
router.get('/student/:username', getStudentByUsername);

module.exports = router;
