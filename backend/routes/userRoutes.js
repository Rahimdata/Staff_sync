const express = require('express');
const {
  getUsers,
  getTeam,
  getUserById,
  updateUser,
  deactivateUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/team', authorize('MANAGER'), getTeam); // must stay above '/:id'
router.get('/', authorize('HR'), getUsers);
router.get('/:id', getUserById); // access rules enforced in the controller
router.put('/:id', authorize('HR'), updateUser);
router.delete('/:id', authorize('HR'), deactivateUser);

module.exports = router;