const express = require('express');
const {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getAnnouncements);
router.post('/', authorize('HR'), createAnnouncement);
router.put('/:id', authorize('HR'), updateAnnouncement);
router.delete('/:id', authorize('HR'), deleteAnnouncement);

module.exports = router;