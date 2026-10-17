const express = require('express');
const {
  checkIn,
  checkOut,
  getMyAttendance,
  getAllAttendance,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // every attendance route requires a valid token

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/my-attendance', getMyAttendance);
router.get('/all', authorize('HR', 'MANAGER'), getAllAttendance);

module.exports = router;