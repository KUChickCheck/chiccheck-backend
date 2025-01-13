const Student = require("../Schema/studentSchema");
const Teacher = require("../Schema/teacherSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Student Registration
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
    });

    const saveStudent = await newStudent.save();

    const token = jwt.sign(
      { studentId: saveStudent._id },
      process.env.JWT_SECRET || "chickcheck",
      { expiresIn: "1h" }
    );

    res.status(201).json({ token, message: "Student registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Student Login
exports.loginStudent = async (req, res) => {
  try {
    const { username, password: inputPassword } = req.body;

    const student = await Student.findOne({ username });

    if (!student) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const isPasswordValid = await bcrypt.compare(
      inputPassword,
      student.password
    );

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { studentId: student._id },
      process.env.JWT_SECRET || "chickcheck",
      { expiresIn: "1h" }
    );

    const { password, class_ids, created_at, __v, ...studentInfo } =
      student.toObject();

    // Send token and user info in response
    res.status(200).json({
      token,
      user: studentInfo,
      message: "Student login successful",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Teacher Registration
exports.registerTeacher = async (req, res) => {
  try {
    const {
      username,
      password,
      confirmPassword,
      teacher_id,
      first_name,
      last_name,
      email,
    } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ msg: "Passwords do not match." });
    }

    const existingUser = await Teacher.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists." });
    }

    const existingTeacherId = await Teacher.findOne({ teacher_id });
    if (existingTeacherId) {
      return res.status(400).json({ message: "Teacher ID already exists." });
    }

    const existingEmail = await Teacher.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists." });
    }

    const newTeacher = new Teacher({
      username,
      password,
      teacher_id,
      first_name,
      last_name,
      email,
    });

    const saveTeacher = await newTeacher.save();

    const token = jwt.sign(
      { teacherId: saveTeacher._id },
      process.env.JWT_SECRET || "chickcheck",
      { expiresIn: "1h" }
    );

    res.status(201).json({ token, message: "Teacher registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Teacher Login
exports.loginTeacher = async (req, res) => {
  try {
    const { username, password } = req.body;

    const teacher = await Teacher.findOne({ username });

    if (!teacher) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, teacher.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { teacherId: teacher._id },
      process.env.JWT_SECRET || "chickcheck",
      { expiresIn: "1h" }
    );

    res.status(200).json({ token, message: "Teacher login successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    const { role } = req.body; // Get the role from the body (e.g., "student" or "teacher")
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ valid: false });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "chickcheck");

    let isValid = false;

    if (role === "student" && decoded.studentId) {
      const student = await Student.findById(decoded.studentId);
      isValid = !!student;
    } else if (role === "teacher" && decoded.teacherId) {
      const teacher = await Teacher.findById(decoded.teacherId);
      isValid = !!teacher;
    }

    if (!isValid) {
      return res.status(400).json({ valid: false });
    }

    res.status(200).json({ valid: true });
  } catch (err) {
    console.error(err);
    res.status(401).json({ valid: false });
  }
};
