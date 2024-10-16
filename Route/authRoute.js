const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { registerStudent, loginStudent, loginTeacher} = require('../Controller/authController');
const jsonParser = bodyParser.json();

router.post('/register', jsonParser, registerStudent);
router.post('/login', jsonParser, loginStudent);
router.post('/dashborad/login', jsonParser, loginTeacher);

module.exports = router;
