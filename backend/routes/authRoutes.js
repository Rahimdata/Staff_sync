const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, signup, login, getMe, changePassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Brute-force protection on login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, try again in 15 minutes' },
});

// Stops bots from flooding HR's approval queue with fake signups
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many signup requests, try again later' },
});

// Slows down guessing the current password with a stolen token
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, try again in 15 minutes' },
});

// Open only while the DB has zero users (bootstrap); afterwards HR only
const bootstrapOrHR = asyncHandler(async (req, res, next) => {
  if ((await User.estimatedDocumentCount()) === 0) return next();
  protect(req, res, (err) => {
    if (err) return next(err);
    authorize('HR')(req, res, next);
  });
});

router.post('/register', bootstrapOrHR, register);
router.post('/signup', signupLimiter, signup);
router.post('/login', loginLimiter, login);
router.get('/me', protect, getMe);
router.put('/change-password', protect, passwordLimiter, changePassword);

module.exports = router;