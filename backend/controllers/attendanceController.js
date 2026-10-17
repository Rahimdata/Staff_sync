const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const asyncHandler = require('../utils/asyncHandler');
const { getToday, parseDateKey } = require('../utils/dateUtils');
const { getPagination, pageMeta } = require('../utils/pagination');
const { getTeamIds } = require('../utils/team');

const STATUSES = ['PRESENT', 'ABSENT', 'LEAVE'];

// Builds a { $gte, $lte } filter from ?from=YYYY-MM-DD&to=YYYY-MM-DD
const buildDateRange = (query, res) => {
  const range = {};
  if (query.from) {
    const from = parseDateKey(query.from);
    if (!from) {
      res.status(400);
      throw new Error("'from' must be in YYYY-MM-DD format");
    }
    range.$gte = from;
  }
  if (query.to) {
    const to = parseDateKey(query.to);
    if (!to) {
      res.status(400);
      throw new Error("'to' must be in YYYY-MM-DD format");
    }
    range.$lte = to;
  }
  if (range.$gte && range.$lte && range.$gte > range.$lte) {
    res.status(400);
    throw new Error("'from' cannot be after 'to'");
  }
  return Object.keys(range).length ? range : null;
};

// @route   POST /api/attendance/check-in
// @access  Private (any role)
const checkIn = asyncHandler(async (req, res) => {
  const today = getToday();

  const onLeave = await Leave.exists({
    userId: req.user._id,
    status: 'APPROVED',
    startDate: { $lte: today },
    endDate: { $gte: today },
  });
  if (onLeave) {
    res.status(400);
    throw new Error('You are on approved leave today');
  }

  try {
    const attendance = await Attendance.create({
      userId: req.user._id,
      date: today,
      checkInTime: new Date(),
      status: 'PRESENT',
    });
    res.status(201).json({ success: true, attendance });
  } catch (err) {
    // Unique index (userId + date) also protects against double-click race conditions
    if (err.code === 11000) {
      res.status(409);
      throw new Error('You have already checked in today');
    }
    throw err;
  }
});

// @route   POST /api/attendance/check-out
// @access  Private (any role)
const checkOut = asyncHandler(async (req, res) => {
  const today = getToday();

  const attendance = await Attendance.findOneAndUpdate(
    { userId: req.user._id, date: today, checkInTime: { $ne: null }, checkOutTime: null },
    { checkOutTime: new Date() },
    { new: true }
  );

  if (!attendance) {
    const existing = await Attendance.findOne({ userId: req.user._id, date: today });
    if (existing && existing.checkOutTime) {
      res.status(409);
      throw new Error('You have already checked out today');
    }
    res.status(400);
    throw new Error('No check-in found for today. Check in first');
  }

  res.json({ success: true, attendance });
});

// @route   GET /api/attendance/my-attendance?from=&to=&page=&limit=
// @access  Private (any role)
const getMyAttendance = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  const range = buildDateRange(req.query, res);
  if (range) filter.date = range;

  const { page, limit, skip } = getPagination(req.query);
  const [attendance, total] = await Promise.all([
    Attendance.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
    Attendance.countDocuments(filter),
  ]);

  res.json({ success: true, count: attendance.length, ...pageMeta(total, page, limit), attendance });
});

// @route   GET /api/attendance/all?userId=&status=&from=&to=&page=&limit=
// @access  HR (everyone) / MANAGER (direct reports only)
const getAllAttendance = asyncHandler(async (req, res) => {
  const filter = {};
  let teamIds = null;

  if (req.user.role === 'MANAGER') {
    teamIds = await getTeamIds(req.user._id);
    filter.userId = { $in: teamIds };
  }

  if (req.query.userId) {
    if (!mongoose.isValidObjectId(req.query.userId)) {
      res.status(400);
      throw new Error('Invalid userId');
    }
    if (teamIds && !teamIds.some((id) => id.equals(req.query.userId))) {
      res.status(403);
      throw new Error('That employee is not on your team');
    }
    filter.userId = req.query.userId;
  }

  if (req.query.status) {
    if (!STATUSES.includes(req.query.status)) {
      res.status(400);
      throw new Error(`status must be one of: ${STATUSES.join(', ')}`);
    }
    filter.status = req.query.status;
  }

  const range = buildDateRange(req.query, res);
  if (range) filter.date = range;

  const { page, limit, skip } = getPagination(req.query);
  const [attendance, total] = await Promise.all([
    Attendance.find(filter)
      .populate('userId', 'name email department designation')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit),
    Attendance.countDocuments(filter),
  ]);

  res.json({ success: true, count: attendance.length, ...pageMeta(total, page, limit), attendance });
});

module.exports = { checkIn, checkOut, getMyAttendance, getAllAttendance };