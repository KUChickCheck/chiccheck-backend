const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  student_id: { type: String, unique: true, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  class_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  created_at: { type: Date, default: Date.now },
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const Student = mongoose.model('Student', studentSchema);
module.exports = Student;