const express = require('express');
const { createTraining, getTraining } = require('../controllers/trainingController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getTraining);
router.post('/', authorize('HR', 'MANAGER'), createTraining);

module.exports = router;