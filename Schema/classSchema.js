const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  class_name: { type: String, required: true },
  class_code: { type: String, unique: true, required: true },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  schedule: {
    days: { type: String, required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
  },
  created_at: { type: Date, default: Date.now }
});

const Class = mongoose.model('Class', classSchema);
module.exports = Class;
