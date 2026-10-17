const express = require('express');
const { createAnnouncement, getAnnouncements } = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getAnnouncements);
router.post('/', authorize('HR'), createAnnouncement);

module.exports = router;