const mongoose = require('mongoose');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

const ROLES = ['HR', 'MANAGER', 'EMPLOYEE'];

// @route   POST /api/auth/register
// @access  First user ever (bootstraps as HR) or an authenticated HR user
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, department, designation, dateOfJoining, managerId } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }

  if (await User.findOne({ email: email.toLowerCase() })) {
    res.status(409);
    throw new Error('A user with this email already exists');
  }

  // First account in an empty system becomes HR; otherwise HR chooses the role
  const isFirstUser = (await User.estimatedDocumentCount()) === 0;
  const assignedRole = isFirstUser ? 'HR' : role || 'EMPLOYEE';

  if (!ROLES.includes(assignedRole)) {
    res.status(400);
    throw new Error(`Role must be one of: ${ROLES.join(', ')}`);
  }

  if (managerId) {
    if (!mongoose.isValidObjectId(managerId)) {
      res.status(400);
      throw new Error('managerId is not a valid id');
    }
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'MANAGER') {
      res.status(400);
      throw new Error('managerId must belong to an existing user with the MANAGER role');
    }
  }

  const user = await User.create({
    name,
    email,
    password,
    role: assignedRole,
    department,
    designation,
    dateOfJoining,
    managerId: managerId || null,
  });

  res.status(201).json({ success: true, token: generateToken(user._id), user });
});

// @route   POST /api/auth/signup
// @access  Public
// Self-service signup from the Register page (Name, Email, Password, Role).
// The account is active right away, so the person can sign in straight after.
// No token is returned, and department/managerId/etc. sent by the client are ignored.
const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body || {};

  // Non-strings (objects, arrays) would crash the string helpers below
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    res.status(400);
    throw new Error('Name, email and password are required');
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanName) {
    res.status(400);
    throw new Error('Enter your name.');
  }
  if (cleanName.length > 100) {
    res.status(400);
    throw new Error('The name can be at most 100 characters.');
  }
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    res.status(400);
    throw new Error('Enter a valid email address.');
  }
  // bcrypt only uses the first 72 bytes, so longer passwords would be silently truncated
  if (password.length < 8 || password.length > 72) {
    res.status(400);
    throw new Error('The password must be between 8 and 72 characters.');
  }

  // Role comes from the Register dropdown. Missing means Employee; anything unknown is rejected.
  const chosenRole = role === undefined || role === '' ? 'EMPLOYEE' : role;
  if (typeof chosenRole !== 'string' || !ROLES.includes(chosenRole)) {
    res.status(400);
    throw new Error(`Role must be one of: ${ROLES.join(', ')}`);
  }

  if (await User.findOne({ email: cleanEmail })) {
    res.status(409);
    throw new Error('An account with this email already exists.');
  }

  // Plain password on purpose: the User model hashes it in its pre('save') hook.
  await User.create({
    name: cleanName,
    email: cleanEmail,
    password,
    role: chosenRole,
  });

  res.status(201).json({ success: true, message: 'Account created. You can sign in now.' });
});

// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  // Same message for "no user" and "wrong password" to prevent account enumeration
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (user.isActive === false) {
    res.status(403);
    throw new Error('This account has been deactivated. Contact HR');
  }

  res.json({ success: true, token: generateToken(user._id), user });
});

// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  await req.user.populate('managerId', 'name email');
  res.json({ success: true, user: req.user });
});

// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Current password and new password are required');
  }
  // bcrypt only uses the first 72 bytes, so longer passwords would be silently truncated
  if (newPassword.length < 8 || newPassword.length > 72) {
    res.status(400);
    throw new Error('The new password must be between 8 and 72 characters');
  }
  if (newPassword === currentPassword) {
    res.status(400);
    throw new Error('The new password must be different from the current one');
  }

  const user = await User.findById(req.user._id).select('+password');

  // 400, not 401: the frontend treats any 401 as "session expired" and signs the person out.
  if (!(await user.matchPassword(currentPassword))) {
    res.status(400);
    throw new Error('Your current password is incorrect');
  }

  user.password = newPassword;
  await user.save(); // hashes it and invalidates every older token

  // The old token is rejected now too, so return a fresh one for this session.
  res.json({ success: true, message: 'Password updated', token: generateToken(user._id) });
});

module.exports = { register, signup, login, getMe, changePassword };