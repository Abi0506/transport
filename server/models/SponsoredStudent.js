const mongoose = require('mongoose');

const sponsoredStudentSchema = new mongoose.Schema({
  registerNumber: { type: String, required: true, unique: true },
  name: { type: String },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('SponsoredStudent', sponsoredStudentSchema);
