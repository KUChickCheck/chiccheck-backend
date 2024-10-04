const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Late'], required: true },
  timestamp: { type: Date, required: true },
  note: { type: String }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
