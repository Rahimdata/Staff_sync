const mongoose = require('mongoose');

const trainingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isCompanyWide: { type: Boolean, default: false },
    status: { type: String, enum: ['PLANNED', 'ONGOING', 'COMPLETED'], default: 'PLANNED' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Training', trainingSchema);