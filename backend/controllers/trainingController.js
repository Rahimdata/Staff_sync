const mongoose = require('mongoose');
const Training = require('../models/Training');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, pageMeta } = require('../utils/pagination');
const { getTeamIds } = require('../utils/team');

const TRAINING_STATUSES = ['PLANNED', 'ONGOING', 'COMPLETED'];

// @route   POST /api/training
// body: { title, description?, assignedEmployees?: [userId], isCompanyWide?: boolean, status? }
// @access  HR (assign anyone) / MANAGER (assign direct reports only)
const createTraining = asyncHandler(async (req, res) => {
  const { title, description, assignedEmployees = [], isCompanyWide = false, status } = req.body;

  if (typeof title !== 'string' || !title.trim() || title.trim().length > 150) {
    res.status(400);
    throw new Error('title is required (max 150 characters)');
  }
  if (description !== undefined && (typeof description !== 'string' || description.length > 2000)) {
    res.status(400);
    throw new Error('description must be a string (max 2000 characters)');
  }
  if (status !== undefined && !TRAINING_STATUSES.includes(status)) {
    res.status(400);
    throw new Error(`status must be one of: ${TRAINING_STATUSES.join(', ')}`);
  }
  if (typeof isCompanyWide !== 'boolean') {
    res.status(400);
    throw new Error('isCompanyWide must be true or false');
  }
  if (!Array.isArray(assignedEmployees) || !assignedEmployees.every((id) => mongoose.isValidObjectId(id))) {
    res.status(400);
    throw new Error('assignedEmployees must be an array of valid user ids');
  }

  const ids = [...new Set(assignedEmployees.map(String))];

  if (!isCompanyWide && ids.length === 0) {
    res.status(400);
    throw new Error('Assign at least one employee or mark the program as company-wide');
  }

  if (ids.length) {
    const found = await User.countDocuments({ _id: { $in: ids } });
    if (found !== ids.length) {
      res.status(400);
      throw new Error('One or more assigned employees do not exist');
    }
    if (req.user.role === 'MANAGER') {
      const teamIds = (await getTeamIds(req.user._id)).map(String);
      if (!ids.every((id) => teamIds.includes(id))) {
        res.status(403);
        throw new Error('You can only assign your own direct reports');
      }
    }
  }

  const training = await Training.create({
    title: title.trim(),
    description: description ? description.trim() : undefined,
    managerId: req.user._id,
    assignedEmployees: ids,
    isCompanyWide,
    status,
  });
  await training.populate([
    { path: 'managerId', select: 'name designation' },
    { path: 'assignedEmployees', select: 'name email department' },
  ]);

  res.status(201).json({ success: true, training });
});

// @route   GET /api/training?status=&page=&limit=
// @access  Private. HR sees all; MANAGER sees own + assigned + company-wide;
//          EMPLOYEE sees assigned + company-wide.
const getTraining = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const { role } = req.user;

  let filter = {};
  if (role === 'MANAGER') {
    filter = { $or: [{ managerId: me }, { assignedEmployees: me }, { isCompanyWide: true }] };
  } else if (role === 'EMPLOYEE') {
    filter = { $or: [{ assignedEmployees: me }, { isCompanyWide: true }] };
  }

  if (req.query.status) {
    if (!TRAINING_STATUSES.includes(req.query.status)) {
      res.status(400);
      throw new Error(`status must be one of: ${TRAINING_STATUSES.join(', ')}`);
    }
    filter.status = req.query.status;
  }

  const { page, limit, skip } = getPagination(req.query);

  let query = Training.find(filter)
    .populate('managerId', 'name designation')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Employees don't get the list of colleagues enrolled alongside them
  query = role === 'EMPLOYEE' ? query.select('-assignedEmployees') : query.populate('assignedEmployees', 'name email department');

  const [trainings, total] = await Promise.all([query, Training.countDocuments(filter)]);

  res.json({ success: true, count: trainings.length, ...pageMeta(total, page, limit), trainings });
});

module.exports = { createTraining, getTraining };