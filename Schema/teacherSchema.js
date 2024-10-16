const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  role: { type: String, enum: ['teacher', 'admin'], default: 'teacher' },
  created_at: { type: Date, default: Date.now },
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
});

teacherSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  });

const Teacher = mongoose.model('Teacher', teacherSchema);
module.exports = Teacher;
