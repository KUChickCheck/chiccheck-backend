const express = require('express');
const cors = require('cors');
const app = express();
const connectDB = require('./Config/db');
const authRoutes = require('./Route/authRoute');
const courseRoutes = require('./Route/courseRoute');

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
