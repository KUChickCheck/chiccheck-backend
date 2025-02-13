const axios = require('axios');
const Student = require("../Schema/studentSchema");
const Teacher = require("../Schema/teacherSchema");
const Class = require("../Schema/classSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

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
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
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

    // First check if student exists in our database
    const student = await Student.findOne({ username });

    if (student) {
      // Normal login process remains the same
      const isPasswordValid = await bcrypt.compare(password, student.password);

      if (!isPasswordValid) {
        return res.status(400).json({ message: "Invalid username or password" });
      }

      const token = jwt.sign(
        { studentId: student._id },
        process.env.JWT_SECRET || "chickcheck",
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );

      const { password: pwd, class_ids, created_at, __v, ...studentInfo } = student.toObject();

      return res.status(200).json({
        token,
        user: studentInfo,
        message: "Student login successful"
      });
    } else {
      // KU API authentication
      try {
        const kuApiUrl = process.env.KU_API || 'https://api-example.ku.th';
        const kuResponse = await axios.post(
          `${kuApiUrl}/kuedu/api/token/pair`,
          { username, password },
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (kuResponse.data && kuResponse.data.access) {
          const studentCode = username.startsWith('b') ? username.substring(1) : username;

          // Get enrollment data
          const enrollmentResponse = await axios.post(
            `${kuApiUrl}/kuedu/api/std/enrollment/semester`,
            {
              student_code: studentCode,
              academic_year: 2567,
              semester: 2
            },
            {
              headers: {
                'Authorization': `Bearer ${kuResponse.data.access}`,
                'Content-Type': 'application/json'
              }
            }
          );

          // Create new student
          const tempEmail = `${username}@temp.chickcheck.com`;
          const newStudent = new Student({
            username,
            password: password,
            student_id: username,
            first_name: "KU",
            last_name: "Student",
            email: tempEmail,
            class_ids: []
          });

          const savedStudent = await newStudent.save();

          // Process enrollment data
          if (enrollmentResponse.data && enrollmentResponse.data.length > 0) {
            for (const enrollment of enrollmentResponse.data) {
              // Process teachers
              const teacherPromises = enrollment.instrs.map(async (instr) => {
                let teacher = await Teacher.findOne({ username: instr.account });

                if (!teacher) {
                  // Create new teacher with a default password
                  const teacherPassword = await bcrypt.hash(instr.account, 10);
                  teacher = await Teacher.create({
                    username: instr.account,
                    password: teacherPassword, // Required field
                    teacher_id: instr.account,
                    first_name: instr.first_name,
                    last_name: instr.last_name,
                    email: `${instr.account}@ku.th`,
                    classes: [] // Initialize empty classes array
                  });
                }
                return teacher;
              });

              const teachers = await Promise.all(teacherPromises);
              const teacherIds = teachers.map(t => t._id);

              // Process class
              let classObj = await Class.findOne({ class_code: enrollment.subject_code });

              if (!classObj) {
                // Convert schedule format (e.g., "Tu 17:00-20:00" to appropriate format)
                const scheduleInfo = enrollment.schedules[0].split(' ');
                const dayMap = {
                  'Mo': 'Monday',
                  'Tu': 'Tuesday',
                  'We': 'Wednesday',
                  'Th': 'Thursday',
                  'Fr': 'Friday',
                  'Sa': 'Saturday',
                  'Su': 'Sunday'
                };
                const [startTime, endTime] = scheduleInfo[1].split('-');

                classObj = await Class.create({
                  class_name: enrollment.subject_name,
                  class_code: enrollment.subject_code,
                  teacher_ids: teacherIds,
                  student_ids: [savedStudent._id],
                  schedule: {
                    days: dayMap[scheduleInfo[0]] || scheduleInfo[0],
                    start_time: startTime,
                    end_time: endTime,
                    late_allowance_minutes: 15
                  }
                });

                // Update teachers' classes array
                await Teacher.updateMany(
                  { _id: { $in: teacherIds } },
                  { $addToSet: { classes: classObj._id } }
                );
              } else {
                // Update existing class
                if (!classObj.student_ids.includes(savedStudent._id)) {
                  classObj.student_ids.push(savedStudent._id);
                }

                // Add any new teachers
                teacherIds.forEach(teacherId => {
                  if (!classObj.teacher_ids.includes(teacherId)) {
                    classObj.teacher_ids.push(teacherId);
                  }
                });

                await classObj.save();

                // Update teachers' classes array
                await Teacher.updateMany(
                  { _id: { $in: teacherIds } },
                  { $addToSet: { classes: classObj._id } }
                );
              }

              // Update student's class_ids
              if (!savedStudent.class_ids.includes(classObj._id)) {
                savedStudent.class_ids.push(classObj._id);
              }
            }
            await savedStudent.save();
          }

          // Generate app token
          const appToken = jwt.sign(
            { studentId: savedStudent._id },
            process.env.JWT_SECRET || "chickcheck",
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
          );

          return res.status(200).json({
            token: appToken,
            user: {
              _id: savedStudent._id,
              username: savedStudent.username,
              student_id: savedStudent.student_id,
              first_name: savedStudent.first_name,
              last_name: savedStudent.last_name,
              email: savedStudent.email,
              class_ids: savedStudent.class_ids
            },
            message: "Student login successful via KU API"
          });
        } else {
          return res.status(400).json({ message: "Invalid credentials from KU API" });
        }
      } catch (kuError) {
        if (kuError.code === 11000) {
          const existingStudent = await Student.findOne({ username });
          if (existingStudent) {
            return exports.loginStudent(req, res);
          }
        }

        console.error("KU API Error:", kuError.response?.data || kuError.message);
        return res.status(400).json({
          message: "Invalid username or password",
          details: "Failed to authenticate with KU API"
        });
      }
    }
  } catch (err) {
    console.error("Login Error:", err);
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
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
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
    const { username, password: inputPassword } = req.body;

    const teacher = await Teacher.findOne({ username });

    if (!teacher) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const isPasswordValid = await bcrypt.compare(inputPassword, teacher.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const { password, class_ids, created_at, __v, ...teacherInfo } =
    teacher.toObject();

    const token = jwt.sign(
      { teacherId: teacher._id },
      process.env.JWT_SECRET || "chickcheck",
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.status(200).json({ token, user: teacherInfo, message: "Teacher login successful" });
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
