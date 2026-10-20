const express = require('express');
const { createTraining, getTraining, updateTraining, deleteTraining } = require('../controllers/trainingController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getTraining);
router.post('/', authorize('HR', 'MANAGER'), createTraining);
router.put('/:id', authorize('HR', 'MANAGER'), updateTraining);
router.delete('/:id', authorize('HR', 'MANAGER'), deleteTraining);

module.exports = router;