const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true }, // store normalized to start of day (UTC)
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    status: { type: String, enum: ['PRESENT', 'ABSENT', 'LEAVE'], default: 'PRESENT' },
  },
  { timestamps: true }
);

// One record per user per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);