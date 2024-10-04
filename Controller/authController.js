const Student = require('../Model/studentSchema');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Course = require('../Model/courseModel');
const mongoose = require('mongoose');

exports.registerUser = async (req, res) => {
  try {
    const { username, password, confirmPassword, student_id, first_name, last_name, email } = req.body;

    if (password !== confirmPassword) return res.status(400).json({ msg: "Passwords do not match" });

    const user = await Student.findOne({ username });

    if (user) {
      return res.status(400).json({ message: 'Username already exists.' });
    }

    const newStudent = new Student({ username, password, student_id, first_name, last_name, email });
    const saveStudent = await newStudent.save();

    const token = jwt.sign({ studentId: saveStudent._id }, process.env.JWT_SECRET || "chickcheck", {
      expiresIn: '1h',
    });

    res.status(201).json({ token, message: 'Student registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const student = await Student.findOne({ username });

    if (!student) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, student.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ studentId: student._id }, process.env.JWT_SECRET || "chickcheck", {
      expiresIn: '1h',
    });

    res.status(200).json({ token, message: 'Login successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};