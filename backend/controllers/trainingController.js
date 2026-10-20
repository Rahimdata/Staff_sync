const mongoose = require('mongoose');
const Training = require('../models/Training');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, pageMeta } = require('../utils/pagination');
const { getTeamIds } = require('../utils/team');

const TRAINING_STATUSES = ['PLANNED', 'ONGOING', 'COMPLETED'];

const isId = (v) => typeof v === 'string' && mongoose.isValidObjectId(v);

const fail = (res, code, message) => {
  res.status(code);
  throw new Error(message);
};

// ───── field checks shared by create and update ─────
const checkTitle = (res, title) => {
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 150) fail(res, 400, 'title is required (max 150 characters)');
  return title.trim();
};
const checkDescription = (res, description) => {
  if (typeof description !== 'string' || description.length > 2000) fail(res, 400, 'description must be text (max 2000 characters)');
  return description.trim();
};
const checkStatus = (res, status) => {
  if (!TRAINING_STATUSES.includes(status)) fail(res, 400, `status must be one of: ${TRAINING_STATUSES.join(', ')}`);
  return status;
};
const checkBoolean = (res, value, field) => {
  if (typeof value !== 'boolean') fail(res, 400, `${field} must be true or false`);
  return value;
};

// Validates the assignee list; managers may only assign their own direct reports.
// Returns de-duplicated ids.
const resolveAssignees = async (req, res, list) => {
  if (!Array.isArray(list) || !list.every(isId)) fail(res, 400, 'assignedEmployees must be an array of valid user ids');
  const ids = [...new Set(list)];

  if (ids.length) {
    const found = await User.countDocuments({ _id: { $in: ids } });
    if (found !== ids.length) fail(res, 400, 'One or more assigned employees do not exist');

    if (req.user.role === 'MANAGER') {
      const teamIds = (await getTeamIds(req.user._id)).map(String);
      if (!ids.every((id) => teamIds.includes(id))) fail(res, 403, 'You can only assign your own direct reports');
    }
  }
  return ids;
};

// Loads a program and checks the caller may change it: HR any, a manager only their own.
const loadManageable = async (req, res) => {
  if (!isId(req.params.id)) fail(res, 400, 'Invalid training id');
  const training = await Training.findById(req.params.id);
  if (!training) fail(res, 404, 'Training program not found');
  if (req.user.role === 'MANAGER' && !training.managerId.equals(req.user._id)) {
    fail(res, 403, 'You can only change programs you created');
  }
  return training;
};

// @route   POST /api/training
// body: { title, description?, assignedEmployees?: [userId], isCompanyWide?: boolean, status? }
// @access  HR (assign anyone) / MANAGER (assign direct reports only)
const createTraining = asyncHandler(async (req, res) => {
  const { title, description, assignedEmployees = [], isCompanyWide = false, status } = req.body;

  const cleanTitle = checkTitle(res, title);
  const cleanDescription = description !== undefined ? checkDescription(res, description) : undefined;
  const cleanStatus = status !== undefined ? checkStatus(res, status) : undefined;
  checkBoolean(res, isCompanyWide, 'isCompanyWide');
  const ids = await resolveAssignees(req, res, assignedEmployees);

  if (!isCompanyWide && ids.length === 0) fail(res, 400, 'Assign at least one employee or mark the program as company-wide');

  const training = await Training.create({
    title: cleanTitle,
    description: cleanDescription || undefined,
    managerId: req.user._id,
    assignedEmployees: ids,
    isCompanyWide,
    status: cleanStatus,
  });
  await training.populate([
    { path: 'managerId', select: 'name designation' },
    { path: 'assignedEmployees', select: 'name email department' },
  ]);

  res.status(201).json({ success: true, training });
});

// @route   PUT /api/training/:id
// body (any of): title, description, status, isCompanyWide, assignedEmployees
// @access  HR (any program) / MANAGER (programs they created)
const updateTraining = asyncHandler(async (req, res) => {
  const training = await loadManageable(req, res);
  const { title, description, status, isCompanyWide, assignedEmployees } = req.body;

  if (title !== undefined) training.title = checkTitle(res, title);
  if (description !== undefined) training.description = checkDescription(res, description);
  if (status !== undefined) training.status = checkStatus(res, status);
  if (isCompanyWide !== undefined) training.isCompanyWide = checkBoolean(res, isCompanyWide, 'isCompanyWide');
  if (assignedEmployees !== undefined) training.assignedEmployees = await resolveAssignees(req, res, assignedEmployees);

  // A program must always have an audience
  if (!training.isCompanyWide && training.assignedEmployees.length === 0) {
    fail(res, 400, 'A program needs at least one person, or must be company-wide');
  }
  if (training.modifiedPaths().length === 0) fail(res, 400, 'No changes to save');

  await training.save();
  await training.populate([
    { path: 'managerId', select: 'name designation' },
    { path: 'assignedEmployees', select: 'name email department' },
  ]);

  res.json({ success: true, training });
});

// @route   DELETE /api/training/:id
// @access  HR (any program) / MANAGER (programs they created)
const deleteTraining = asyncHandler(async (req, res) => {
  const training = await loadManageable(req, res);
  await training.deleteOne();
  res.json({ success: true, message: 'Training program deleted' });
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

  if (req.query.status !== undefined) {
    checkStatus(res, req.query.status);
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

module.exports = { createTraining, getTraining, updateTraining, deleteTraining };