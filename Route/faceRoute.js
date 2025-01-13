const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../Middlewares/authMiddleware");
const { faceVerify } = require("../Controller/faceController");

/**
 * @swagger
 * tags:
 *   name: Face Verification
 *   description: Endpoints for face verification
 */

/**
 * @swagger
 * /api/face/verify:
 *   post:
 *     tags:
 *       - Face Verification
 *     summary: Verify a user's face
 *     security:
 *       - BearerAuth: [] # Requires JWT authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               student_code:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Base64 encoded image or a file upload
 *             required:
 *               - photo
 *     responses:
 *       200:
 *         description: Face verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 match:
 *                   type: boolean
 *       400:
 *         description: Bad request, missing or invalid parameters
 *       401:
 *         description: Unauthorized, invalid token
 *       500:
 *         description: Internal server error
 */
router.post("/verify", authenticateToken("student"), faceVerify);

module.exports = router;
