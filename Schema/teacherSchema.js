const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  teacher_id: { type: String, unique: true, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  created_at: { type: Date, default: Date.now }
});

const Teacher = mongoose.model('Teacher', teacherSchema);
module.exports = Teacher;
