const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Late', 'Absent'],
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  }
});

attendanceSchema.index({ student_id: 1, class_id: 1, timestamp: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;