const CheckIn = require('../Model/checkInModel');
const User = require('../Model/studentSchema');
const Course = require('../Model/courseModel');

// Create a new check-in
exports.createCheckIn = async (req, res) => {
  try {
    const { userId, courseId, status, note, image } = req.body;

    // Validate user existence
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate course existence
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Create new check-in
    const newCheckIn = new CheckIn({ userId, courseId, status, note, image });
    const savedCheckIn = await newCheckIn.save();

    res.status(201).json({ message: 'Check-in created successfully', checkIn: savedCheckIn });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get all check-ins
exports.getAllCheckIns = async (req, res) => {
  try {
    const checkIns = await CheckIn.find().populate('userId').populate('courseId');
    res.status(200).json(checkIns);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get a check-in by ID
exports.getCheckInById = async (req, res) => {
  try {
    const checkIn = await CheckIn.findById(req.params.id).populate('userId').populate('courseId');
    if (!checkIn) {
      return res.status(404).json({ message: 'Check-in not found' });
    }
    res.status(200).json(checkIn);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Update a check-in
exports.updateCheckIn = async (req, res) => {
  try {
    const { status, note, image } = req.body;
    const checkIn = await CheckIn.findById(req.params.id);

    if (!checkIn) {
      return res.status(404).json({ message: 'Check-in not found' });
    }

    checkIn.status = status;
    checkIn.note = note;
    checkIn.image = image;

    const updatedCheckIn = await checkIn.save();
    res.status(200).json({ message: 'Check-in updated successfully', checkIn: updatedCheckIn });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Delete a check-in
exports.deleteCheckIn = async (req, res) => {
  try {
    const checkIn = await CheckIn.findById(req.params.id);

    if (!checkIn) {
      return res.status(404).json({ message: 'Check-in not found' });
    }

    await checkIn.remove();
    res.status(200).json({ message: 'Check-in deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
