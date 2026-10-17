const mongoose = require('mongoose');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');
const ROLES = ['HR', 'MANAGER', 'EMPLOYEE'];

// @route   POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, department, designation, dateOfJoining, managerId } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');}

  if (await User.findOne({ email: email.toLowerCase() })) {
    res.status(409);
    throw new Error('A user with this email already exists');}

  const isFirstUser = (await User.estimatedDocumentCount()) === 0;
  const assignedRole = isFirstUser ? 'HR' : role || 'EMPLOYEE';

  if (!ROLES.includes(assignedRole)) {
    res.status(400);
    throw new Error(`Role must be one of: ${ROLES.join(', ')}`);}

  if (managerId) {
    if (!mongoose.isValidObjectId(managerId)) {
      res.status(400);
      throw new Error('managerId is not a valid id');}
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'MANAGER') {
      res.status(400);
      throw new Error('managerId must belong to an existing user with the MANAGER role');}}

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
  res.status(201).json({ success: true, token: generateToken(user._id), user });});

// @route   POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');}

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');}

  if (user.isActive === false) {
    res.status(403);
    throw new Error('This account has been deactivated. Contact HR');}

  res.json({ success: true, token: generateToken(user._id), user });});

// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});
module.exports = { register, login, getMe };