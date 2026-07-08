const mongoose = require('mongoose');

const finalPaymentSchema = new mongoose.Schema({
  registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
  registerNumber: { type: String, required: true, trim: true },
  receiptNumber: { type: String, required: true, trim: true },
  miscellaneousAmount: { type: Number, required: true },
  paymentDate: { type: Date },
  verifiedBy: { type: String, default: 'office' },
  verifiedAt: { type: Date, default: Date.now },
  uploadedAt: { type: Date, default: Date.now },
  source: { type: String, default: 'pdf-import' }
}, { timestamps: true });

finalPaymentSchema.index({ registerNumber: 1, receiptNumber: 1 }, { unique: true });

module.exports = mongoose.model('FinalPayment', finalPaymentSchema);
