const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const {
  registerStudent,
  loginStudent,
  registerTeacher,
  loginTeacher,
  verifyToken,
} = require("../Controller/authController");
const jsonParser = bodyParser.json();

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: Operations related to user authentication
 */

/**
 * @swagger
 * /api/auth/student/register:
 *   post:
 *     summary: Register a new student
 *     description: This endpoint allows the registration of a new student.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *               student_id:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student registered successfully
 *       400:
 *         description: Invalid input data
 */
router.post("/student/register", jsonParser, registerStudent);

/**
 * @swagger
 * /api/auth/student/login:
 *   post:
 *     summary: Login a student
 *     description: This endpoint allows a student to log in with their credentials.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student logged in successfully
 *       400:
 *         description: Invalid credentials
 */
router.post("/student/login", jsonParser, loginStudent);

/**
 * @swagger
 * /api/auth/teacher/register:
 *   post:
 *     summary: Register a new teacher
 *     description: This endpoint allows the registration of a new teacher.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *               teacher_id:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Teacher registered successfully
 *       400:
 *         description: Invalid input data
 */
router.post("/teacher/register", jsonParser, registerTeacher);

/**
 * @swagger
 * /api/auth/teacher/login:
 *   post:
 *     summary: Login a teacher
 *     description: This endpoint allows a teacher to log in with their credentials.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Teacher logged in successfully
 *       400:
 *         description: Invalid credentials
 */
router.post("/teacher/login", jsonParser, loginTeacher);

/**
 * @swagger
 * /api/auth/verify-token:
 *   post:
 *     summary: Verify a user token
 *     description: Validates the token for a student or teacher based on the provided role.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 description: The role of the user (student or teacher).
 *                 enum:
 *                   - student
 *                   - teacher
 *     responses:
 *       200:
 *         description: Token is valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   description: Indicates whether the token is valid.
 *               example:
 *                 valid: true
 *       400:
 *         description: Role mismatch or invalid token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   description: Indicates whether the token is valid.
 *               example:
 *                 valid: false
 *       401:
 *         description: Unauthorized, token is missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   description: Indicates whether the token is valid.
 *               example:
 *                 valid: false
 */
 router.post("/verify-token", jsonParser, verifyToken);

module.exports = router;
