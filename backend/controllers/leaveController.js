const mongoose = require('mongoose');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const asyncHandler = require('../utils/asyncHandler');
const { getToday, parseDateKey } = require('../utils/dateUtils');
const { getPagination, pageMeta } = require('../utils/pagination');
const { getTeamIds } = require('../utils/team');

const LEAVE_TYPES = ['SICK', 'CASUAL', 'ANNUAL', 'UNPAID'];
const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

// @route   POST /api/leaves/apply
// @access  Private (any role)
const applyLeave = asyncHandler(async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;

  if (!LEAVE_TYPES.includes(leaveType)) {
    res.status(400);
    throw new Error(`leaveType must be one of: ${LEAVE_TYPES.join(', ')}`);
  }

  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  if (!start || !end) {
    res.status(400);
    throw new Error('startDate and endDate must be in YYYY-MM-DD format');
  }
  if (end < start) {
    res.status(400);
    throw new Error('endDate cannot be before startDate');
  }
  // Sick leave may be filed after the fact; everything else must start today or later
  if (leaveType !== 'SICK' && start < getToday()) {
    res.status(400);
    throw new Error('startDate cannot be in the past');
  }

  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) {
    res.status(400);
    throw new Error('reason is required (max 500 characters)');
  }

  const overlap = await Leave.exists({
    userId: req.user._id,
    status: { $in: ['PENDING', 'APPROVED'] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  });
  if (overlap) {
    res.status(409);
    throw new Error('You already have a pending or approved leave overlapping these dates');
  }

  const worked = await Attendance.findOne({
    userId: req.user._id,
    checkInTime: { $ne: null },
    date: { $gte: start, $lte: end },
  });
  if (worked) {
    res.status(409);
    throw new Error(`You already have attendance recorded on ${worked.date.toISOString().slice(0, 10)}. Choose dates you have not worked`);
  }

  const leave = await Leave.create({
    userId: req.user._id,
    leaveType,
    startDate: start,
    endDate: end,
    reason: reason.trim(),
  });

  res.status(201).json({ success: true, leave });
});

// @route   GET /api/leaves/my-leaves?status=&page=&limit=
// @access  Private (any role)
const getMyLeaves = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };

  if (req.query.status) {
    if (!LEAVE_STATUSES.includes(req.query.status)) {
      res.status(400);
      throw new Error(`status must be one of: ${LEAVE_STATUSES.join(', ')}`);
    }
    filter.status = req.query.status;
  }

  const { page, limit, skip } = getPagination(req.query);
  const [leaves, total] = await Promise.all([
    Leave.find(filter)
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Leave.countDocuments(filter),
  ]);

  res.json({ success: true, count: leaves.length, ...pageMeta(total, page, limit), leaves });
});

// @route   GET /api/leaves/pending?page=&limit=
// @access  HR (all) / MANAGER (direct reports only). Your own leave is never listed.
const getPendingLeaves = asyncHandler(async (req, res) => {
  const filter = { status: 'PENDING', userId: { $ne: req.user._id } };

  if (req.user.role === 'MANAGER') {
    filter.userId = { $in: await getTeamIds(req.user._id), $ne: req.user._id };
  }

  const { page, limit, skip } = getPagination(req.query);
  const [leaves, total] = await Promise.all([
    Leave.find(filter)
      .populate('userId', 'name email department designation')
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit),
    Leave.countDocuments(filter),
  ]);

  res.json({ success: true, count: leaves.length, ...pageMeta(total, page, limit), leaves });
});

// @route   PUT /api/leaves/:id/status   body: { "status": "APPROVED" | "REJECTED" }
// @access  HR (any employee) / MANAGER (direct reports only)
const updateLeaveStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid leave id');
  }
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    res.status(400);
    throw new Error("status must be 'APPROVED' or 'REJECTED'");
  }

  const leave = await Leave.findById(id).populate('userId', 'managerId');
  if (!leave || !leave.userId) {
    res.status(404);
    throw new Error('Leave request not found');
  }

  // Nobody approves their own leave, including HR
  if (leave.userId._id.equals(req.user._id)) {
    res.status(403);
    throw new Error('You cannot review your own leave request');
  }

  // Managers only act on their direct reports
  if (req.user.role === 'MANAGER' && String(leave.userId.managerId) !== String(req.user._id)) {
    res.status(403);
    throw new Error('This employee is not on your team');
  }

  // Atomic: only a still-PENDING request can be changed (blocks double-review races)
  const updated = await Leave.findOneAndUpdate(
    { _id: id, status: 'PENDING' },
    { status, reviewedBy: req.user._id },
    { new: true }
  ).populate('userId', 'name email department');

  if (!updated) {
    res.status(409);
    throw new Error(`This leave request has already been ${leave.status.toLowerCase()}`);
  }

  res.json({ success: true, leave: updated });
});

// @route   GET /api/leaves/all?status=&userId=&page=&limit=
// Full request history (any status) for reviewers.
// @access  HR (everyone) / MANAGER (direct reports only)
const getAllLeaves = asyncHandler(async (req, res) => {
  const filter = {};
  let teamIds = null;

  if (req.user.role === 'MANAGER') {
    teamIds = await getTeamIds(req.user._id);
    filter.userId = { $in: teamIds };
  }

  if (req.query.userId !== undefined) {
    if (typeof req.query.userId !== 'string' || !mongoose.isValidObjectId(req.query.userId)) {
      res.status(400);
      throw new Error('Invalid userId');
    }
    if (teamIds && !teamIds.some((id) => id.equals(req.query.userId))) {
      res.status(403);
      throw new Error('That employee is not on your team');
    }
    filter.userId = req.query.userId;
  }

  if (req.query.status !== undefined) {
    if (!LEAVE_STATUSES.includes(req.query.status)) {
      res.status(400);
      throw new Error(`status must be one of: ${LEAVE_STATUSES.join(', ')}`);
    }
    filter.status = req.query.status;
  }

  const { page, limit, skip } = getPagination(req.query);
  const [leaves, total] = await Promise.all([
    Leave.find(filter)
      .populate('userId', 'name email department designation')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Leave.countDocuments(filter),
  ]);

  res.json({ success: true, count: leaves.length, ...pageMeta(total, page, limit), leaves });
});

// @route   GET /api/leaves/today
// Approved leave that covers today, so dashboards can show who is away.
// @access  HR (everyone) / MANAGER (direct reports only)
const getLeavesToday = asyncHandler(async (req, res) => {
  const today = getToday();
  const filter = { status: 'APPROVED', startDate: { $lte: today }, endDate: { $gte: today } };

  if (req.user.role === 'MANAGER') {
    filter.userId = { $in: await getTeamIds(req.user._id) };
  }

  const leaves = await Leave.find(filter).populate('userId', 'name department').limit(200);
  res.json({ success: true, count: leaves.length, leaves });
});

// @route   DELETE /api/leaves/:id
// Withdraw your own request while it is still pending.
// @access  Private (owner only)
const cancelLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid leave id');
  }

  const removed = await Leave.findOneAndDelete({ _id: id, userId: req.user._id, status: 'PENDING' });
  if (!removed) {
    const existing = await Leave.findById(id);
    if (!existing || !existing.userId.equals(req.user._id)) {
      res.status(404);
      throw new Error('Leave request not found');
    }
    res.status(409);
    throw new Error('Only pending requests can be cancelled');
  }

  res.json({ success: true, message: 'Leave request cancelled' });
});

module.exports = { applyLeave, getMyLeaves, getPendingLeaves, updateLeaveStatus, getAllLeaves, getLeavesToday, cancelLeave };