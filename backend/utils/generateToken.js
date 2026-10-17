const jwt = require('jsonwebtoken');
// Only the id goes in the token. Role is read from the DB on every request,so a demoted or deleted user loses access immediately.
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

module.exports = generateToken;