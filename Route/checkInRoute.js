// Route/checkInRoute.js
const express = require('express');
const router = express.Router();
const checkInController = require('../Controller/checkInController');
const { authenticateToken } = require('../Middleware/authMiddleware');
const upload = require('../Middleware/uploadMiddleware');

// CRUD operations for check-ins with file upload for create and update
router.post('/', authenticateToken, upload, checkInController.createCheckIn);
router.get('/', authenticateToken, checkInController.getAllCheckIns);
router.get('/:id', authenticateToken, checkInController.getCheckInById);
router.put('/:id', authenticateToken, upload, checkInController.updateCheckIn);
router.delete('/:id', authenticateToken, checkInController.deleteCheckIn);

module.exports = router;
