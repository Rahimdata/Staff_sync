const User = require('../models/User');

// IDs of employees who report directly to this manager
const getTeamIds = (managerId) => User.find({ managerId }).distinct('_id');

module.exports = { getTeamIds };