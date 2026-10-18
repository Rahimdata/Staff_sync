const mongoose = require('mongoose');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { parseDateKey } = require('../utils/dateUtils');
const { getPagination, pageMeta } = require('../utils/pagination');

const ROLES = ['HR', 'MANAGER', 'EMPLOYEE'];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isId = (v) => typeof v === 'string' && mongoose.isValidObjectId(v);
const hasActiveReports = (managerId) => User.exists({ managerId, isActive: { $ne: false } });

// @route   GET /api/users?role=&department=&managerId=&q=&status=active|inactive|all&page=&limit=
// @access  HR only
const getUsers = asyncHandler(async (req, res) => {
  const { role, department, managerId, q, status = 'active' } = req.query;
  const filter = {};

  if (role !== undefined) {
    if (!ROLES.includes(role)) {
      res.status(400);
      throw new Error(`role must be one of: ${ROLES.join(', ')}`);
    }
    filter.role = role;
  }
  if (department !== undefined) {
    filter.department = new RegExp(`^${escapeRegex(String(department))}$`, 'i');
  }
  if (managerId !== undefined) {
    if (!isId(managerId)) {
      res.status(400);
      throw new Error('Invalid managerId');
    }
    filter.managerId = managerId;
  }
  if (q !== undefined) {
    const rx = new RegExp(escapeRegex(String(q)), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  if (status === 'active') filter.isActive = { $ne: false };
  else if (status === 'inactive') filter.isActive = false;
  else if (status !== 'all') {
    res.status(400);
    throw new Error("status must be 'active', 'inactive' or 'all'");
  }

  const { page, limit, skip } = getPagination(req.query);
  const [users, total] = await Promise.all([
    User.find(filter).populate('managerId', 'name email').sort({ name: 1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, count: users.length, ...pageMeta(total, page, limit), users });
});

// @route   GET /api/users/team
// @access  MANAGER (their active direct reports)
const getTeam = asyncHandler(async (req, res) => {
  const users = await User.find({ managerId: req.user._id, isActive: { $ne: false } }).sort({ name: 1 });
  res.json({ success: true, count: users.length, users });
});

// @route   GET /api/users/:id
// @access  HR, the user themselves, or the user's manager
const getUserById = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) {
    res.status(400);
    throw new Error('Invalid user id');
  }

  const user = await User.findById(req.params.id).populate('managerId', 'name email');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const isSelf = user._id.equals(req.user._id);
  const isTheirManager = user.managerId && user.managerId._id.equals(req.user._id);
  if (req.user.role !== 'HR' && !isSelf && !isTheirManager) {
    res.status(403);
    throw new Error('You are not allowed to view this user');
  }

  res.json({ success: true, user });
});

// @route   PUT /api/users/:id
// body (any of): name, email, department, designation, role, managerId (or null), dateOfJoining, isActive
// Passwords are intentionally NOT editable here.
// @access  HR only
const updateUser = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) {
    res.status(400);
    throw new Error('Invalid user id');
  }

  const target = await User.findById(req.params.id);
  if (!target) {
    res.status(404);
    throw new Error('User not found');
  }

  const isSelf = target._id.equals(req.user._id);
  const { name, email, department, designation, role, managerId, dateOfJoining, isActive } = req.body;

  const text = (value, field) => {
    if (typeof value !== 'string' || !value.trim() || value.length > 100) {
      res.status(400);
      throw new Error(`${field} must be a non-empty string (max 100 characters)`);
    }
    return value.trim();
  };

  if (name !== undefined) target.name = text(name, 'name');
  if (email !== undefined) target.email = text(email, 'email').toLowerCase();
  if (department !== undefined) target.department = text(department, 'department');
  if (designation !== undefined) target.designation = text(designation, 'designation');

  if (dateOfJoining !== undefined) {
    const d = parseDateKey(dateOfJoining);
    if (!d) {
      res.status(400);
      throw new Error('dateOfJoining must be in YYYY-MM-DD format');
    }
    target.dateOfJoining = d;
  }

  if (role !== undefined && role !== target.role) {
    if (!ROLES.includes(role)) {
      res.status(400);
      throw new Error(`role must be one of: ${ROLES.join(', ')}`);
    }
    if (isSelf) {
      res.status(403);
      throw new Error('You cannot change your own role');
    }
    if (target.role === 'MANAGER' && (await hasActiveReports(target._id))) {
      res.status(409);
      throw new Error('This manager still has direct reports. Reassign them first');
    }
    target.role = role;
  }

  if (managerId !== undefined) {
    if (managerId === null) {
      target.managerId = null;
    } else {
      if (!isId(managerId)) {
        res.status(400);
        throw new Error('managerId is not a valid id');
      }
      if (target._id.equals(managerId)) {
        res.status(400);
        throw new Error('A user cannot be their own manager');
      }
      const manager = await User.findById(managerId);
      if (!manager || manager.role !== 'MANAGER' || manager.isActive === false) {
        res.status(400);
        throw new Error('managerId must belong to an active user with the MANAGER role');
      }
      target.managerId = manager._id;
    }
  }

  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      res.status(400);
      throw new Error('isActive must be true or false');
    }
    if (!isActive) {
      if (isSelf) {
        res.status(403);
        throw new Error('You cannot deactivate your own account');
      }
      if (target.role === 'MANAGER' && (await hasActiveReports(target._id))) {
        res.status(409);
        throw new Error('This manager still has direct reports. Reassign them first');
      }
    }
    target.isActive = isActive;
  }

  if (target.modifiedPaths().length === 0) {
    res.status(400);
    throw new Error('No valid fields to update');
  }

  await target.save(); // runs schema validation + unique email index
  await target.populate('managerId', 'name email');

  res.json({ success: true, user: target });
});

// @route   DELETE /api/users/:id
// Deactivates (soft delete). Attendance, leave and training history is preserved.
// @access  HR only
const deactivateUser = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) {
    res.status(400);
    throw new Error('Invalid user id');
  }

  const target = await User.findById(req.params.id);
  if (!target) {
    res.status(404);
    throw new Error('User not found');
  }
  if (target._id.equals(req.user._id)) {
    res.status(403);
    throw new Error('You cannot deactivate your own account');
  }
  if (target.isActive === false) {
    res.status(409);
    throw new Error('User is already deactivated');
  }
  if (target.role === 'MANAGER' && (await hasActiveReports(target._id))) {
    res.status(409);
    throw new Error('This manager still has direct reports. Reassign them first');
  }

  target.isActive = false;
  await target.save();

  res.json({ success: true, message: 'User deactivated', user: target });
});

// @route   PUT /api/users/:id/password   body: { "newPassword": "..." }
// HR sets a temporary password for someone who is locked out. Their sessions all end.
// @access  HR only (use "change password" for your own account)
const resetPassword = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) {
    res.status(400);
    throw new Error('Invalid user id');
  }
  const { newPassword } = req.body;
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 72) {
    res.status(400);
    throw new Error('The new password must be between 8 and 72 characters');
  }

  const target = await User.findById(req.params.id);
  if (!target) {
    res.status(404);
    throw new Error('User not found');
  }
  if (target._id.equals(req.user._id)) {
    res.status(400);
    throw new Error('To change your own password, use the change password form on your profile');
  }

  target.password = newPassword;
  await target.save();

  res.json({ success: true, message: `Password reset for ${target.name}` });
});

module.exports = { getUsers, getTeam, getUserById, updateUser, deactivateUser, resetPassword };