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
          const studentIdWithoutB = username.startsWith('b') ? username.substring(1) : username;
          const tempEmail = `${username}@temp.chickcheck.com`;
          const newStudent = new Student({
            username,
            password: password,
            student_id: studentIdWithoutB,
            first_name: "KU",
            last_name: "Student",
            email: tempEmail,
            class_ids: []
          });

          const savedStudent = await newStudent.save();

          // Time formatting helper function
          const formatTime = (time) => {
            const [hours, minutes] = time.split(':');
            return `${hours.padStart(2, '0')}:${minutes || '00'}`;
          };

          // Process enrollment data
          if (enrollmentResponse.data && enrollmentResponse.data.length > 0) {
            try {
              for (const enrollment of enrollmentResponse.data) {
                if (enrollment.enroll_status !== 'A') {
                  console.log(`Skipping ${enrollment.subject_code} - ${enrollment.subject_name} due to status: ${enrollment.enroll_status}`);
                  continue;
                }

                // Process teachers with better error handling
                const processedTeachers = [];
                for (const instr of enrollment.instrs) {
                  try {
                    // Check for existing teacher by BOTH username and teacher_id
                    let teacher = await Teacher.findOne({
                      $or: [
                        { username: instr.account },
                        { teacher_id: instr.account }
                      ]
                    });

                    if (!teacher) {
                      try {
                        teacher = await Teacher.create({
                          username: instr.account,
                          password: instr.account,
                          teacher_id: instr.account,
                          first_name: instr.first_name,
                          last_name: instr.last_name,
                          email: `${instr.account}@ku.th`,
                          classes: []
                        });
                      } catch (createError) {
                        if (createError.code === 11000) {
                          teacher = await Teacher.findOne({ teacher_id: instr.account });
                          if (!teacher) {
                            throw createError;
                          }
                        } else {
                          throw createError;
                        }
                      }
                    }

                    if (teacher.first_name !== instr.first_name || teacher.last_name !== instr.last_name) {
                      teacher.first_name = instr.first_name;
                      teacher.last_name = instr.last_name;
                      await teacher.save();
                    }

                    processedTeachers.push(teacher);
                  } catch (error) {
                    console.error('Error processing teacher:', instr.account, error);
                    throw error;
                  }
                }

                // Get unique teacher IDs while preserving order
                const teacherIds = processedTeachers
                  .filter((t, index, self) =>
                    index === self.findIndex((s) => s._id.toString() === t._id.toString())
                  )
                  .map(t => t._id);

                if (!teacherIds.length) {
                  console.error('No valid teacher IDs found for class:', enrollment.subject_code);
                  continue;
                }

                // Process class
                try {
                  let classObj = await Class.findOne({ class_code: enrollment.subject_code });

                  if (!classObj) {
                      // Convert schedule format with proper day mapping for each schedule
                      const schedules = enrollment.schedules.map(schedule => {
                          const scheduleInfo = schedule.split(' ');
                          const dayMap = {
                              'M': 'Monday',
                              'Mo': 'Monday',
                              'T': 'Tuesday',
                              'Tu': 'Tuesday',
                              'W': 'Wednesday',
                              'We': 'Wednesday',
                              'Th': 'Thursday',
                              'F': 'Friday',
                              'Fr': 'Friday',
                              'Sa': 'Saturday',
                              'Su': 'Sunday'
                          };

                          // Split time part and ensure proper formatting
                          const [startTime, endTime] = scheduleInfo[1].split('-');

                          // Handle the day part
                          const rawDay = scheduleInfo[0];
                          const mappedDay = dayMap[rawDay] || rawDay;

                          return {
                              days: mappedDay,
                              start_time: formatTime(startTime),
                              end_time: formatTime(endTime),
                              late_allowance_minutes: 15
                          };
                      });

                      classObj = await Class.create({
                          class_name: enrollment.subject_name,
                          class_code: enrollment.subject_code,
                          teacher_ids: teacherIds,
                          student_ids: [savedStudent._id],
                          schedule: schedules
                      });
                  } else {
                    if (!classObj.student_ids.map(id => id.toString()).includes(savedStudent._id.toString())) {
                      classObj.student_ids.push(savedStudent._id);
                    }

                    // Update teacher_ids while preserving order and removing duplicates
                    const existingTeacherSet = new Set(classObj.teacher_ids.map(id => id.toString()));
                    teacherIds.forEach(teacherId => {
                      const teacherIdStr = teacherId.toString();
                      if (!existingTeacherSet.has(teacherIdStr)) {
                        classObj.teacher_ids.push(teacherId);
                        existingTeacherSet.add(teacherIdStr);
                      }
                    });

                    await classObj.save();
                  }

                  // Add class to student's class_ids if not already there
                  if (!savedStudent.class_ids.map(id => id.toString()).includes(classObj._id.toString())) {
                    savedStudent.class_ids.push(classObj._id);
                  }

                  // Update teachers' classes array
                  for (const teacherId of teacherIds) {
                    await Teacher.updateOne(
                      { _id: teacherId },
                      { $addToSet: { classes: classObj._id } }
                    );
                  }

                } catch (error) {
                  console.error('Error processing class:', enrollment.subject_code, error);
                  throw error;
                }
              }

              await savedStudent.save();

            } catch (error) {
              console.error('Error in enrollment processing:', error);
              throw error;
            }
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
