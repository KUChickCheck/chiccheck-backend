const express = require('express');
const cors = require('cors');
const app = express();
const connectDB = require('./Config/db');
const authRoutes = require('./Route/authRoute');
const studentRoute = require('./Route/studentRoute');
const teacherRoute = require('./Route/teacherRoute');

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoute)
app.use('/api/teacher', teacherRoute)

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
