const Student = require("../Schema/studentSchema");
const Teacher = require('../Schema/teacherSchema');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.registerStudent = async (req, res) => {
  try {
    const {
      username,
      password,
      confirmPassword,
      student_id,
      first_name,
      last_name,
      email,
      role,
    } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ msg: "Passwords do not match." });
    }

    const existingUser = await Student.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists." });
    }

    const existingStudentId = await Student.findOne({ student_id });
    if (existingStudentId) {
      return res.status(400).json({ message: "Student ID already exists." });
    }

    const existingEmail = await Student.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists." });
    }

    const newStudent = new Student({
      username,
      password,
      student_id,
      first_name,
      last_name,
      email,
      role: role || 'student',
    });

    const saveStudent = await newStudent.save();

    const token = jwt.sign(
      { studentId: saveStudent._id, role: saveStudent.role },
      process.env.JWT_SECRET || "chickcheck",
      { expiresIn: "1h" }
    );

    res.status(201).json({ token, message: "Student registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.loginStudent = async (req, res) => {
  try {
    const { username, password } = req.body;

    const student = await Student.findOne({ username });

    if (!student) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, student.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { studentId: student._id, role: student.role },
      process.env.JWT_SECRET || "chickcheck",
      {
        expiresIn: "1h",
      }
    );

    res.status(200).json({ token, message: "Login successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.loginTeacher = async (req, res) => {
  try {
      const { username, password } = req.body;

      const teacher = await Teacher.findOne({ username });
      if (!teacher) {
          return res.status(400).json({ message: 'Invalid username or password' });
      }

      const isMatch = await bcrypt.compare(password, teacher.password);
      if (!isMatch) {
          return res.status(400).json({ message: 'Invalid username or password' });
      }

      const token = jwt.sign(
        { teacherId: teacher._id, role: teacher.role },
        process.env.JWT_SECRET || "chickcheck",
        {
          expiresIn: "3h",
        }
      );

      res.status(200).json({ token, message: "Login successful" });
  } catch (error) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
  }
};
