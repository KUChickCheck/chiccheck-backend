const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { registerUser, loginUser } = require('../Controller/authController');
const jsonParser = bodyParser.json();

// POST Method /register
router.post('/register', jsonParser, registerUser);

// POST Method /login
router.post('/login', jsonParser, loginUser);

module.exports = router;