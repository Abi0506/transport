const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
  registerNumber: { type: String },
  employeeId: { type: String },
  mailId: { type: String, required: true },
  routeSuggestion: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Suggestion', suggestionSchema);
