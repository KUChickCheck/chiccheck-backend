const Teacher = require('../Schema/teacherSchema');
const bcrypt = require('bcryptjs');

exports.createTeacher = async (req, res) => {
    try {
        const { first_name, last_name, email, classes, role, username, password } = req.body;

        let existingTeacher = await Teacher.findOne({ $or: [{ email }, { username }] });
        if (existingTeacher) {
            return res.status(400).json({ message: 'Email or username already exists' });
        }

        const teacher = new Teacher({
            first_name,
            last_name,
            email,
            classes,
            role: role || 'teacher',
            username,
            password
        });

        await teacher.save();
        res.status(201).json({ message: 'Teacher created successfully', teacher });
    } catch (error) {
        res.status(500).json({ message: 'Error creating teacher', error });
    }
};

exports.getAllTeachers = async (req, res) => {
    try {
        const teachers = await Teacher.find().select('-password').populate('classes');
        res.status(200).json(teachers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching teachers', error });
    }
};

exports.getTeacherById = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id).select('-password').populate('classes');
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        res.status(200).json(teacher);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching teacher', error });
    }
};

exports.updateTeacher = async (req, res) => {
    try {
        const { first_name, last_name, email, classes, role, username } = req.body;

        const teacher = await Teacher.findByIdAndUpdate(
            req.params.id,
            { first_name, last_name, email, classes, role, username },
            { new: true, runValidators: true }
        );

        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        res.status(200).json({ message: 'Teacher updated successfully', teacher });
    } catch (error) {
        res.status(500).json({ message: 'Error updating teacher', error });
    }
};

exports.deleteTeacher = async (req, res) => {
    try {
        const teacher = await Teacher.findByIdAndDelete(req.params.id);

        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        res.status(200).json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting teacher', error });
    }
};
