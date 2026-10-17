const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// 1) Verifies the JWT and attaches the current user to req.user
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  const token = header.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET); // throws on invalid/expired

  const user = await User.findById(decoded.id);
  if (!user || user.isActive === false) {
    res.status(401);
    throw new Error('Not authorized, user no longer exists or is deactivated');
  }

  req.user = user;
  next();
});

// 2) Role gate. Always use AFTER protect.
//    Usage: router.get('/x', protect, authorize('HR', 'MANAGER'), handler)
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error(`Role '${req.user ? req.user.role : 'unknown'}' is not permitted to perform this action`));
    }
    next();
  };

module.exports = { protect, authorize };