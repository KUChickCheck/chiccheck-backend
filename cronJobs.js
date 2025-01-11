const cron = require('node-cron');
const moment = require('moment');
const Class = require('./Schema/classSchema');
const Attendance = require('./Schema/attendanceSchema');
const Student = require('./Schema/studentSchema');

// Function to mark absent students for a specific class
async function markAbsentForClass(classDoc) {
    try {
        const currentTime = moment();
        const currentDay = currentTime.format('dddd').toLowerCase();
        const classDays = classDoc.schedule.days.split(',').map(day => day.trim().toLowerCase());

        // Check if today is a class day
        if (!classDays.includes(currentDay)) {
            return;
        }

        // Get class end time for today
        const classEndTime = moment(`${currentTime.format('YYYY-MM-DD')} ${classDoc.schedule.end_time}`, 'YYYY-MM-DD HH:mm');

        // Only proceed if current time is after class end time
        if (currentTime.isAfter(classEndTime)) {
            // Get existing attendance records for today
            const existingAttendance = await Attendance.find({
                class_id: classDoc._id,
                timestamp: {
                    $gte: moment().startOf('day'),
                    $lte: moment().endOf('day')
                }
            });

            // Get students who haven't marked attendance
            const studentsWithAttendance = existingAttendance.map(record =>
                record.student_id.toString()
            );

            const absentStudents = classDoc.student_ids.filter(studentId =>
                !studentsWithAttendance.includes(studentId.toString())
            );

            // Mark absent for students who haven't marked attendance
            for (const studentId of absentStudents) {
                await Attendance.create({
                    student_id: studentId,
                    class_id: classDoc._id,
                    status: 'Absent',
                    timestamp: classEndTime.toDate()
                });
            }

            console.log(`Marked ${absentStudents.length} students absent for class ${classDoc.class_name}`);
        }
    } catch (error) {
        console.error(`Error marking absences for class ${classDoc.class_name}:`, error);
    }
}

// Function to check all classes and mark absences
async function checkAllClasses() {
    try {
        const classes = await Class.find();
        for (const classDoc of classes) {
            await markAbsentForClass(classDoc);
        }
    } catch (error) {
        console.error('Error in checkAllClasses:', error);
    }
}

// Set up cron jobs
function setupCronJobs() {
// Run once per day at a specific time (e.g., midnight)
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily attendance check...');
    await checkAllClasses();
});

}

module.exports = { setupCronJobs };