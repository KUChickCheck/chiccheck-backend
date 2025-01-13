const express = require("express");
const cors = require("cors");
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const connectDB = require("./Config/db");
const authRoutes = require("./Route/authRoute");
const studentRoute = require("./Route/studentRoute");
const classRoute = require("./Route/classRoute");
const teacherRoute = require("./Route/teacherRoute");
const attendanceRoute = require("./Route/attendanceRoute");
const { setupCronJobs } = require("./cronJobs");

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Swagger setup
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0", // Specify OpenAPI version
    info: {
      title: "ChicCheck API", // API title
      version: "1.0.0", // API version
      description:
        "API documentation for managing students, classes, teachers, attendance, and authentication.", // Description
    },
    servers: [
        {
            url: "http://localhost:3000",
            description: "Development Server",
          },
          {
            url: "https://breezejirasak.com/api",
            description: "Staging Server",
          },
    ],
    tags: [
      {
        name: "Authentication",
        description: "Operations related to user authentication",
      },
      {
        name: "Attendance",
        description: "Operations related to attendance management",
      },
      {
        name: "Face Verification",
        description: "Endpoints for face verification"
      },
      {
        name: "Students",
        description: "Endpoints related to student management",
      },
      {
        name: "Teachers",
        description: "Endpoints related to teacher management",
      },
      {
        name: "Classes",
        description: "Endpoints related to class management",
      },
    ],
    security: [
        {
          BearerAuth: [] // Default security for all routes requiring authentication
        }
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT", // Specify JWT format
          }
        }
      }
  },
  apis: ["./Route/*.js"], // Path to your route files for JSDoc annotations
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Setup Swagger UI for API documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));



// Middleware
// Configure body parser to handle large payloads
app.use(express.json({ limit: "100mb" })); // Adjust the limit as needed
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoute);
app.use("/api/class", classRoute);
app.use("/api/teacher", teacherRoute);
app.use("/api/attendance", attendanceRoute);
app.use("/api/face", attendanceRoute);

// Setup cron jobs
setupCronJobs();

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
