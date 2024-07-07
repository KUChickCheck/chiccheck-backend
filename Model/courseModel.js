const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseID: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  outTime: {
    type: String,
    required: true,
  },
  room_no: {
    type: String,
    required: true,
  },
});

const course_model = mongoose.model('Course', courseSchema);

module.exports = course_model;
