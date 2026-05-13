const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
  rollNumber: { type: String, required: true },
  amount: { type: Number, default: 5000 },
  receiptFile: { type: String },
  paidStatus: {
    type: String,
    enum: ['pending', 'uploaded', 'confirmed'],
    default: 'pending'
  },
  confirmationMethod: {
    type: String,
    enum: ['upload', 'manual', 'bulk'],
  },
  confirmedBy: { type: String },
  confirmedAt: { type: Date },
  notes: { type: String }
}, { timestamps: true });

paymentSchema.index({ rollNumber: 1 });
paymentSchema.index({ paidStatus: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
