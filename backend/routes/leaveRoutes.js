const express = require('express');
const {
  applyLeave,
  getMyLeaves,
  getPendingLeaves,
  updateLeaveStatus,
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/apply', applyLeave);
router.get('/my-leaves', getMyLeaves);
router.get('/pending', authorize('HR', 'MANAGER'), getPendingLeaves);
router.put('/:id/status', authorize('HR', 'MANAGER'), updateLeaveStatus);

module.exports = router;