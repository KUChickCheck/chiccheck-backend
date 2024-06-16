const express = require('express');
const app = express();
const connectDB = require('./Config/db');
const authRoutes = require('./Route/authRoute');
const testRoutes = require('./Route/testRoute');


// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));