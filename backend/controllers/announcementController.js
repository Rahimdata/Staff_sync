const mongoose = require('mongoose');
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

// @route   PUT /api/announcements/:id   body: { title?, content? }
// @access  HR only
const updateAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid announcement id');
  }

  const announcement = await Announcement.findById(id);
  if (!announcement) {
    res.status(404);
    throw new Error('Announcement not found');
  }

  const { title, content } = req.body;
  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 150) {
      res.status(400);
      throw new Error('title is required (max 150 characters)');
    }
    announcement.title = title.trim();
  }
  if (content !== undefined) {
    if (typeof content !== 'string' || !content.trim() || content.trim().length > 5000) {
      res.status(400);
      throw new Error('content is required (max 5000 characters)');
    }
    announcement.content = content.trim();
  }

  if (announcement.modifiedPaths().length === 0) {
    res.status(400);
    throw new Error('No changes to save');
  }

  await announcement.save();
  await announcement.populate('authorId', 'name designation');
  res.json({ success: true, announcement });
});

// @route   DELETE /api/announcements/:id
// @access  HR only
const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid announcement id');
  }
  const removed = await Announcement.findByIdAndDelete(id);
  if (!removed) {
    res.status(404);
    throw new Error('Announcement not found');
  }
  res.json({ success: true, message: 'Announcement deleted' });
});

module.exports = { createAnnouncement, getAnnouncements, updateAnnouncement, deleteAnnouncement };