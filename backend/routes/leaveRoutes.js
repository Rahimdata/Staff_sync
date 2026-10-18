const express = require('express');
const {
  applyLeave,
  getMyLeaves,
  getPendingLeaves,
  updateLeaveStatus,
  getAllLeaves,
  getLeavesToday,
  cancelLeave,
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/apply', applyLeave);
router.get('/my-leaves', getMyLeaves);
router.get('/pending', authorize('HR', 'MANAGER'), getPendingLeaves);
router.get('/all', authorize('HR', 'MANAGER'), getAllLeaves);
router.get('/today', authorize('HR', 'MANAGER'), getLeavesToday);
router.put('/:id/status', authorize('HR', 'MANAGER'), updateLeaveStatus);
router.delete('/:id', cancelLeave);

module.exports = router;