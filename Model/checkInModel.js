// Model/checkInModel.js
const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  checkInTime: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'leave'],
    required: true,
  },
  note: {
    type: String,
    default: '',
  },
  image: {
    type: String,
    default: '',
  },
});

const CheckIn = mongoose.model('CheckIn', checkInSchema);

module.exports = CheckIn;
