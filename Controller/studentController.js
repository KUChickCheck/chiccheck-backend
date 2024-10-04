const Student = require('../Schema/studentSchema');

// GET all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find();
    res.status(200).json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET a single student by ID
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.status(200).json(student);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST a new student
exports.createStudent = async (req, res) => {
  try {
    const { username, password, student_id, first_name, last_name, email, role } = req.body;

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

    const hashedPassword = await bcrypt.hash(password, 10);
    const newStudent = new Student({
      username,
      password: hashedPassword,
      student_id,
      first_name,
      last_name,
      email,
      role: role || 'student',
    });

    const saveStudent = await newStudent.save();
    res.status(201).json({ message: "Student registered successfully", student: saveStudent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// PUT update an existing student by ID
exports.updateStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const updates = req.body;

    const updatedStudent = await Student.findByIdAndUpdate(studentId, updates, { new: true });
    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ message: "Student updated successfully", student: updatedStudent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// DELETE a student by ID
exports.deleteStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const deletedStudent = await Student.findByIdAndDelete(studentId);
    if (!deletedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
