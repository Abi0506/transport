const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  // Common fields
  userType: {
    type: String,
    enum: ['student', 'faculty', 'staff'],
    required: true
  },
  name: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  address: { type: String, required: true },
  pincode: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  emergencyPhoneNumber: { type: String, required: true },  mailId: { type: String, required: true },
  department: {
    type: String,
    required: true,
    enum: [
      // B.E Programs
      'B.E. Civil Engineering',
      'B.E. Computer Science and Engineering',
      'B.E. Electrical and Electronics Engineering',
      'B.E. Electronics and Communication Engineering',
      'B.E. Instrumentation and Control Engineering',
      'B.E. Mechanical Engineering',
      'B.E. Robotics and Artificial Intelligence',
      // B.Tech Programs
      'B.Tech. Artificial Intelligence and Data Science',
      'B.Tech. Electronics Engineering (VLSI Design and Technology)',
      // M.E Programs
      'M.E. Structural Engineering',
      'M.E. Engineering Design',
      // B.Arch
      'B.Arch. Bachelor of Architecture'
    ]
  },
  institution: { type: String, required: true, enum: ['PSG iTech', 'PSG IAP'] },
  boardingPoint: { type: String, required: true },
  boardingPointRoute: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  boardingPointFees: { type: Number },

  // Student-specific fields
  registerNumber: { type: String },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  academicYear: { type: Number, min: 1, max: 5 },
  loginUsername: { type: String },
  loginPasswordHash: { type: String },

  // Faculty/Staff-specific fields
  employeeId: { type: String },
  isBlocked: { type: Boolean, default: false },

  // Calculated fields
  age: { type: Number },
  distanceOrder: { type: Number }, // from stop data (1 = farthest)
  feeConcession: { type: Number, default: 0 }, // 0.50 for faculty, 0.25 for staff
  finalFees: { type: Number },

  // Status fields
  registrationStatus: {
    type: String,
    enum: ['pending', 'allocated', 'rejected', 'confirmed', 'waitlisted', 'cancelled', 'rejected_refund'],
    default: 'pending'
  },
  allocatedRoute: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  allocatedStop: { type: String },

  // Payment
  advancePaid: { type: Boolean, default: false },
  advancePaymentDate: { type: Date },
  advanceConfirmationMethod: { type: String, enum: ['upload', 'manual', 'bulk', null], default: null },
  receiptFile: { type: String }, // Advance fee receipt
  advanceReceiptNumber: { type: String },
  
  fullFeePaid: { type: Boolean, default: false },
  finalReceiptFile: { type: String }, // Final fee receipt
  finalConfirmationMethod: { type: String, enum: ['upload', 'manual', 'bulk', null], default: null },

  // Guidelines
  guidelinesAccepted: { type: Boolean, default: false },
  instructionsAccepted: { type: Boolean, default: false },

  // Phase
  phase: { type: Number, enum: [1, 2] },

  // Cancellation
  cancellationRequested: { type: Boolean, default: false },
  cancellationReason: { type: String },
  cancellationLetter: { type: String },
  deallocationReason: { type: String },
  deallocatedAt: { type: Date }
}, { timestamps: true });

// Calculate age before saving
registrationSchema.pre('save', function (next) {
  if (this.dateOfBirth) {
    const today = new Date();
    const birth = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    this.age = age;
  }

  // Set fee concession
  if (this.userType === 'faculty') {
    this.feeConcession = 0.50;
  } else if (this.userType === 'staff') {
    this.feeConcession = 0.25;
  } else {
    this.feeConcession = 0;
  }

  // Calculate final fees
  if (this.boardingPointFees) {
    this.finalFees = this.boardingPointFees * (1 - this.feeConcession);
  }

  // Set phase
  if (this.userType === 'student') {
    this.phase = this.academicYear === 1 ? 2 : 1;
  } else {
    this.phase = 1;
  }

  next();
});

// Index for efficient queries
registrationSchema.index({ userType: 1, registrationStatus: 1 });
registrationSchema.index({ boardingPoint: 1 });
registrationSchema.index({ allocatedRoute: 1 });
registrationSchema.index({ registerNumber: 1 });
registrationSchema.index({ employeeId: 1 });
registrationSchema.index({ loginUsername: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Registration', registrationSchema);
