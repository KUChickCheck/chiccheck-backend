// Schema/noteSchema.js
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
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
    date: {
        type: String,
        required: true
    },
    note_text: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now
    }
});

const Note = mongoose.model('Note', noteSchema);
module.exports = Note;