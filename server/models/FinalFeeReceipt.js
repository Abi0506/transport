const mongoose = require('mongoose');

const finalFeeReceiptSchema = new mongoose.Schema({
  registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
  rollNumber: { type: String, required: true },
  receiptNumber: { type: String, default: null, trim: true },
  receiptFile: { type: String, required: true },
  finalPaidAmount: { type: Number, default: null },
  expectedFinalAmount: { type: Number, default: null },
  uploadedAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ['uploaded', 'confirmed'],
    default: 'uploaded'
  },
  notes: { type: String }
}, { timestamps: true });

finalFeeReceiptSchema.index({ rollNumber: 1 });
finalFeeReceiptSchema.index({ rollNumber: 1, receiptNumber: 1 });

module.exports = mongoose.model('FinalFeeReceipt', finalFeeReceiptSchema);
