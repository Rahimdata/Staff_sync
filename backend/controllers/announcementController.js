const Announcement = require('../models/Announcement');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, pageMeta } = require('../utils/pagination');

// @route   POST /api/announcements
// @access  HR only
const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, content } = req.body;

  if (typeof title !== 'string' || !title.trim() || title.trim().length > 150) {
    res.status(400);
    throw new Error('title is required (max 150 characters)');
  }
  if (typeof content !== 'string' || !content.trim() || content.trim().length > 5000) {
    res.status(400);
    throw new Error('content is required (max 5000 characters)');
  }

  const announcement = await Announcement.create({
    title: title.trim(),
    content: content.trim(),
    authorId: req.user._id,
  });
  await announcement.populate('authorId', 'name designation');

  res.status(201).json({ success: true, announcement });
});

// @route   GET /api/announcements?page=&limit=
// @access  Private (any role)
const getAnnouncements = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 10);

  const [announcements, total] = await Promise.all([
    Announcement.find()
      .populate('authorId', 'name designation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Announcement.countDocuments(),
  ]);

  res.json({ success: true, count: announcements.length, ...pageMeta(total, page, limit), announcements });
});

module.exports = { createAnnouncement, getAnnouncements };