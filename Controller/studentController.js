const Student = require('../Schema/studentSchema');
const Class = require('../Schema/classSchema');

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
    if (req.params.id !== req.user.studentId) {
      return res.status(403).json({ message: "Access forbidden: You can only access your own data." });
    }

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

// Register student to a class
exports.registerClass = async (req, res) => {
  try {
    const studentId = req.params.id;
    const { class_id } = req.body;

    // Ensure student can only register themselves
    if (studentId !== req.user.studentId) {
      return res.status(403).json({ message: "You can only register yourself for classes" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const classExists = await Class.findById(class_id);
    if (!classExists) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (student.class_ids.includes(class_id)) {
      return res.status(400).json({ message: "You are already registered to this class" });
    }

    // Update both student and class documents
    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      { $push: { class_ids: class_id } },
      { new: true }
    ).populate('class_ids', 'class_name class_code');

    await Class.findByIdAndUpdate(
      class_id,
      { $push: { student_ids: studentId } }
    );

    res.status(200).json({
      message: "Successfully registered to class",
      student: updatedStudent
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Unregister student from a class
exports.unregisterClass = async (req, res) => {
  try {
    const studentId = req.params.id;
    const { class_id } = req.body;

    // Ensure student can only unregister themselves
    if (studentId !== req.user.studentId) {
      return res.status(403).json({ message: "You can only unregister yourself from classes" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (!student.class_ids.includes(class_id)) {
      return res.status(400).json({ message: "You are not registered to this class" });
    }

    // Update both student and class documents
    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      { $pull: { class_ids: class_id } },
      { new: true }
    ).populate('class_ids', 'class_name class_code');

    await Class.findByIdAndUpdate(
      class_id,
      { $pull: { student_ids: studentId } }
    );

    res.status(200).json({
      message: "Successfully unregistered from class",
      student: updatedStudent
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};