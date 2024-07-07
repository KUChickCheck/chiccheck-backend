const express = require('express');
const router = express.Router();
const { createCourse, getAllCourses, getCourseById, updateCourse, deleteCourse } = require('../Controller/courseController');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();

router.post('/add', jsonParser, createCourse);
router.get('/', getAllCourses);
router.get('/:id', getCourseById);
router.put('/:id', jsonParser, updateCourse);
router.delete('/:id', deleteCourse);

module.exports = router;
