const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  fees: { type: Number, required: true },
  time: { type: String, required: true },
  distanceOrder: { type: Number, required: true } // 1 = farthest from college
});

const routeSchema = new mongoose.Schema({
  routeNumber: { type: String, required: true, unique: true },
  routeName: { type: String, required: true },
  capacity: { type: Number, required: true },
  stops: [stopSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Virtual: total registered for this route
routeSchema.virtual('registeredCount', {
  ref: 'Registration',
  localField: '_id',
  foreignField: 'allocatedRoute',
  count: true
});

routeSchema.set('toJSON', { virtuals: true });
routeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Route', routeSchema);
