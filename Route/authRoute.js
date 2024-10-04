const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { registerUser, loginUser} = require('../Controller/authController');
const jsonParser = bodyParser.json();

router.post('/register', jsonParser, registerUser);
router.post('/login', jsonParser, loginUser);

module.exports = router;
