const express = require('express');
const router = express.Router();
const { verifyCookieToken } = require('../Middlewares/authMiddleware');
const { getSimpleString } = require('../Controller/testController');

const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

router.post('/test', jsonParser, verifyCookieToken, getSimpleString);

module.exports = router;
