const Teacher = require('../Schema/teacherSchema');
const Class = require('../Schema/classSchema');

// GET all teachers
exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().populate('classes', 'class_name class_code');
    res.status(200).json(teachers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET a single teacher by ID
exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('classes', 'class_name class_code schedule');

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    res.status(200).json(teacher);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST create a new teacher
exports.createTeacher = async (req, res) => {
  try {
    const { teacher_id, first_name, last_name, email } = req.body;

    // Check if teacher_id already exists
    const existingTeacherId = await Teacher.findOne({ teacher_id });
    if (existingTeacherId) {
      return res.status(400).json({ message: "Teacher ID already exists" });
    }

    // Check if email already exists
    const existingEmail = await Teacher.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const newTeacher = new Teacher({
      teacher_id,
      first_name,
      last_name,
      email
    });

    const savedTeacher = await newTeacher.save();
    res.status(201).json({
      message: "Teacher created successfully",
      teacher: savedTeacher
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// PUT update an existing teacher
exports.updateTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const updates = req.body;

    // If updating teacher_id, check if it already exists
    if (updates.teacher_id) {
      const existingTeacherId = await Teacher.findOne({
        teacher_id: updates.teacher_id,
        _id: { $ne: teacherId }
      });
      if (existingTeacherId) {
        return res.status(400).json({ message: "Teacher ID already exists" });
      }
    }

    // If updating email, check if it already exists
    if (updates.email) {
      const existingEmail = await Teacher.findOne({
        email: updates.email,
        _id: { $ne: teacherId }
      });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      updates,
      { new: true }
    ).populate('classes', 'class_name class_code');

    if (!updatedTeacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.status(200).json({
      message: "Teacher updated successfully",
      teacher: updatedTeacher
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// DELETE a teacher
exports.deleteTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;

    // Find teacher first to check if exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Update all classes that this teacher teaches to remove teacher reference
    await Class.updateMany(
      { teacher_id: teacherId },
      { $unset: { teacher_id: "" } }
    );

    // Delete the teacher
    await Teacher.findByIdAndDelete(teacherId);

    res.status(200).json({ message: "Teacher deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// GET teacher's classes
exports.getTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const teacher = await Teacher.findById(teacherId)
      .populate({
        path: 'classes',
        select: 'class_name class_code schedule'
      });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.status(200).json(teacher.classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Assign teacher to a class
exports.assignToClass = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { class_id } = req.body;

    // Ensure teacher can only assign themselves
    if (teacherId !== req.user.teacherId) {
      return res.status(403).json({ message: "You can only assign yourself to classes" });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const classExists = await Class.findById(class_id);
    if (!classExists) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (teacher.classes.includes(class_id)) {
      return res.status(400).json({ message: "You are already assigned to this class" });
    }

    // Add teacher to class's teacher_ids and class to teacher's classes
    await Class.findByIdAndUpdate(
      class_id,
      { $push: { teacher_ids: teacherId } }
    );

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { $push: { classes: class_id } },
      { new: true }
    ).populate('classes', 'class_name class_code');

    res.status(200).json({
      message: "Successfully assigned to class",
      teacher: updatedTeacher
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Remove teacher from a class
exports.removeFromClass = async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { class_id } = req.body;

    // Ensure teacher can only remove themselves
    if (teacherId !== req.user.teacherId) {
      return res.status(403).json({ message: "You can only remove yourself from classes" });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    if (!teacher.classes.includes(class_id)) {
      return res.status(400).json({ message: "You are not assigned to this class" });
    }

    // Remove teacher from class's teacher_ids and class from teacher's classes
    await Class.findByIdAndUpdate(
      class_id,
      { $pull: { teacher_ids: teacherId } }
    );

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { $pull: { classes: class_id } },
      { new: true }
    ).populate('classes', 'class_name class_code');

    res.status(200).json({
      message: "Successfully removed from class",
      teacher: updatedTeacher
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};