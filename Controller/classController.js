const Class = require('../Schema/classSchema');
const Teacher = require('../Schema/teacherSchema');
const Student = require('../Schema/studentSchema');
const Attendance = require('../Schema/attendanceSchema');
const moment = require('moment');

exports.getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate('teacher_ids', 'first_name last_name')
      .populate('student_ids', 'first_name last_name student_id');
    res.status(200).json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get class by ID with populated teachers and students
exports.getClassById = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate('teacher_ids', 'first_name last_name')
      .populate('student_ids', 'first_name last_name student_id');
    if (!classItem) {
      return res.status(404).json({ message: "Class not found" });
    }
    res.status(200).json(classItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Modify createClass to handle multiple teachers
exports.createClass = async (req, res) => {
  try {
    const { class_name, class_code, teacher_ids, schedule } = req.body;

    // Check if class code already exists
    const existingClass = await Class.findOne({ class_code });
    if (existingClass) {
      return res.status(400).json({ message: "Class code already exists" });
    }

    // Verify all teachers exist
    if (teacher_ids && teacher_ids.length > 0) {
      const teacherCount = await Teacher.countDocuments({
        _id: { $in: teacher_ids }
      });
      if (teacherCount !== teacher_ids.length) {
        return res.status(400).json({ message: "One or more teachers not found" });
      }
    }

    const newClass = new Class({
      class_name,
      class_code,
      teacher_ids,
      schedule
    });

    const savedClass = await newClass.save();

    // Update all teachers' classes array
    if (teacher_ids && teacher_ids.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: teacher_ids } },
        { $push: { classes: savedClass._id } }
      );
    }

    res.status(201).json({ message: "Class created successfully", class: savedClass });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Modify updateClass to handle multiple teachers
exports.updateClass = async (req, res) => {
  try {
    const classId = req.params.id;
    const updates = req.body;

    // If updating class_code, check if it already exists
    if (updates.class_code) {
      const existingClass = await Class.findOne({
        class_code: updates.class_code,
        _id: { $ne: classId }
      });
      if (existingClass) {
        return res.status(400).json({ message: "Class code already exists" });
      }
    }

    // If updating teacher_ids
    if (updates.teacher_ids) {
      // Verify all new teachers exist
      const teacherCount = await Teacher.countDocuments({
        _id: { $in: updates.teacher_ids }
      });
      if (teacherCount !== updates.teacher_ids.length) {
        return res.status(400).json({ message: "One or more teachers not found" });
      }

      // Get current class data
      const currentClass = await Class.findById(classId);
      if (currentClass) {
        // Remove class from old teachers' classes array
        await Teacher.updateMany(
          { _id: { $in: currentClass.teacher_ids } },
          { $pull: { classes: classId } }
        );

        // Add class to new teachers' classes array
        await Teacher.updateMany(
          { _id: { $in: updates.teacher_ids } },
          { $push: { classes: classId } }
        );
      }
    }

    const updatedClass = await Class.findByIdAndUpdate(
      classId,
      updates,
      { new: true }
    ).populate('teacher_ids', 'first_name last_name');

    if (!updatedClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    res.status(200).json({ message: "Class updated successfully", class: updatedClass });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const classId = req.params.id;

    // Find the class first to get teacher_ids and student_ids
    const classToDelete = await Class.findById(classId);
    if (!classToDelete) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Remove class from all teachers' classes array
    if (classToDelete.teacher_ids && classToDelete.teacher_ids.length > 0) {
      await Teacher.updateMany(
        { _id: { $in: classToDelete.teacher_ids } },
        { $pull: { classes: classId } }
      );
    }

    // Remove class from all students' class_ids array
    if (classToDelete.student_ids && classToDelete.student_ids.length > 0) {
      await Student.updateMany(
        { _id: { $in: classToDelete.student_ids } },
        { $pull: { class_ids: classId } }
      );
    }

    // Delete the class
    await Class.findByIdAndDelete(classId);

    res.status(200).json({ message: "Class deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getStudentClassesByDay = async (req, res) => {
    try {
        const { student_id, day } = req.params;

        // Find student to verify existence
        const student = await Student.findById(student_id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Get all classes for this student
        const classes = await Class.find({
            _id: { $in: student.class_ids }
        })
        .populate('teacher_ids', 'first_name last_name')
        .lean();

        // Get attendance records for today for these classes
        const today = moment().format('YYYY-MM-DD');
        const attendanceRecords = await Attendance.find({
            student_id: student_id,
            class_id: { $in: classes.map(c => c._id) },
            timestamp: {
                $gte: moment(today).startOf('day'),
                $lte: moment(today).endOf('day')
            }
        }).lean();

        // Create attendance map for quick lookup
        const attendanceMap = {};
        attendanceRecords.forEach(record => {
            attendanceMap[record.class_id.toString()] = record.status;
        });

        // Filter classes for the specific day and format response data
        let classesWithStatus = classes
            .filter(classItem => {
                // Check each schedule in the array for the specific day
                return classItem.schedule.some(schedule => {
                    const classDays = schedule.days.toLowerCase();
                    return classDays.includes(day.toLowerCase());
                });
            })
            .map(classItem => {
                // Find the schedule for this specific day
                const daySchedule = classItem.schedule.find(schedule =>
                    schedule.days.toLowerCase().includes(day.toLowerCase())
                );

                return {
                    class_name: classItem.class_name,
                    class_id: classItem._id,
                    teachers: classItem.teacher_ids.map(teacher => ({
                        id: teacher._id,
                        name: `${teacher.first_name} ${teacher.last_name}`
                    })),
                    schedule: {
                        days: daySchedule.days,
                        start_time: daySchedule.start_time,
                        end_time: daySchedule.end_time,
                        late_allowance_minutes: daySchedule.late_allowance_minutes
                    }, 
                    status: attendanceMap[classItem._id.toString()] || 'Not checked'
                };
            });

        // Sort classes
        classesWithStatus.sort((a, b) => {
            const aChecked = a.status !== 'Not checked';
            const bChecked = b.status !== 'Not checked';

            if (aChecked === bChecked) {
                return a.schedule.start_time.localeCompare(b.schedule.start_time);
            }
            return aChecked ? 1 : -1;
        });

        res.status(200).json(classesWithStatus);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};