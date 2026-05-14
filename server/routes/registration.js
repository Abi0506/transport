const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const Registration = require('../models/Registration');
const Route = require('../models/Route');
const { sendMail } = require('../utils/mailer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadMultiple = upload.fields([
  { name: 'advanceReceipt', maxCount: 1 },
  { name: 'fullPaymentReceipt', maxCount: 1 }
]);

const sendRegistrationConfirmation = async ({ mailId, name, stopName }) => {
  if (!mailId) return;

  const subject = 'Transport Registration Confirmation - AY 2026-27';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background: #2f5ea8; color: #fff; padding: 16px; text-align: center; font-size: 24px; font-weight: 700;">
        Transport Section PSG iTech
      </div>
      <div style="padding: 24px; color: #222; line-height: 1.7;">
        <p>Dear ${name},</p>
        <p>Thank you for registering in the Transport App of PSGiTech for availing college bus during AY 2026-27.</p>
        <p><strong>Your login credentials are:</strong></p>
        <p style="margin-left: 16px;">
          User name: Register Number / D.No.<br />
          Password: Date of Birth (yyyymmdd)
        </p>
        <p><strong>Advance Payment:</strong> ₹5,000 must be paid in advance (cash at office). This amount is refundable as per transport rules.</p>
        <p>Allocation will be done based on your boarding point and the distance matrix.</p>
        <p>If you are allotted a seat, you will receive an allocation mail regarding bus fees, payment date, bus route number, and other procedures.</p>
        <p><strong>Important:</strong> Please refer to the Transport Guidelines for detailed information.</p>
        <p>Thank you</p>
        <p>With Regards<br />Team Transport</p>
      </div>
    </div>
  `;

  await sendMail(mailId, subject, html);
};

router.get('/boarding-points', async (req, res) => {
  try {
    const routes = await Route.find({ isActive: true }).sort({ routeNumber: 1 });
    const grouped = routes.map(r => ({
      routeId: r._id,
      routeNumber: r.routeNumber,
      routeName: r.routeName,
      capacity: r.capacity,
      stops: r.stops.map(s => ({
        name: s.name,
        fees: s.fees,
        time: s.time,
        distanceOrder: s.distanceOrder
      }))
    }));
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check if advance payment exists for a roll number
router.get('/check-advance/:registerNumber', async (req, res) => {
  try {
    const { registerNumber } = req.params;
    const Payment = require('../models/Payment');
    
    // Only block completed registrations; office-created drafts can still be finished here
    const existingReg = await Registration.findOne({ registerNumber, registrationCompleted: true });
    if (existingReg) {
      return res.json({ advancePaid: false, alreadyRegistered: true });
    }
    
    // Check payment records
    const payment = await Payment.findOne({ rollNumber: registerNumber, paidStatus: 'confirmed' });
    if (payment) {
      return res.json({ advancePaid: true, alreadyRegistered: false });
    }
    
    res.json({ advancePaid: false, alreadyRegistered: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/student', uploadMultiple, async (req, res) => {
  try {
    const registrationData = typeof req.body.registration === 'string'
      ? JSON.parse(req.body.registration)
      : req.body.registration;

    const {
      registerNumber, name, gender, dateOfBirth, academicYear,
      department, institution, address, pincode, boardingPoint,
      phoneNumber, emergencyPhoneNumber, mailId,
      guidelinesAccepted, instructionsAccepted,
      advanceReceiptNumber, advancePaymentDate,
      fullPaymentReceiptNumber, fullPaymentDate
    } = registrationData || req.body;

    if (!guidelinesAccepted || !instructionsAccepted) {
      return res.status(400).json({ message: 'You must accept both guidelines and instructions' });
    }

    const existing = await Registration.findOne({ registerNumber, userType: 'student', registrationCompleted: true });
    const draft = await Registration.findOne({ registerNumber, userType: 'student', registrationCompleted: false });
    if (existing) {
      return res.status(400).json({ message: 'Student with this register number already registered' });
    }

    // Check email uniqueness
    const emailExists = await Registration.findOne({ mailId, _id: { $ne: draft?._id } });
    if (emailExists) {
      return res.status(400).json({ message: 'This email is already used in another registration' });
    }

    const route = await Route.findOne({ 'stops.name': boardingPoint });
    if (!route) {
      return res.status(400).json({ message: 'Invalid boarding point' });
    }
    const stop = route.stops.find(s => s.name === boardingPoint);
    // If office has already confirmed advance payment, prefer that payment record
    const Payment = require('../models/Payment');
    const payment = await Payment.findOne({ rollNumber: registerNumber, paidStatus: 'confirmed' });

    const registrationPayload = {
      userType: 'student',
      registerNumber,
      name,
      gender,
      dateOfBirth: new Date(dateOfBirth),
      academicYear: parseInt(academicYear),
      department,
      institution,
      address,
      pincode,
      boardingPoint,
      boardingPointRoute: route._id,
      boardingPointFees: stop.fees,
      distanceOrder: stop.distanceOrder,
      phoneNumber,
      emergencyPhoneNumber,
      mailId,
      guidelinesAccepted,
      instructionsAccepted,
      receiptFile: req.files?.advanceReceipt?.[0]?.filename || (payment ? payment.receiptFile : null),
      advanceReceiptNumber: advanceReceiptNumber || (payment ? payment.receiptNumber : null),
      advancePaid: !!req.files?.advanceReceipt?.[0] || !!payment,
      advancePaymentDate: advancePaymentDate ? new Date(advancePaymentDate) : (payment ? payment.confirmedAt || payment.createdAt : null),
      advanceConfirmationMethod: req.files?.advanceReceipt?.[0] ? 'upload' : (payment ? (payment.confirmationMethod || 'manual') : null),
      finalReceiptFile: req.files?.fullPaymentReceipt?.[0]?.filename || null,
      fullPaymentReceiptNumber: fullPaymentReceiptNumber || null,
      fullFeePaid: !!req.files?.fullPaymentReceipt?.[0],
      fullPaymentDate: fullPaymentDate ? new Date(fullPaymentDate) : null,
      finalConfirmationMethod: req.files?.fullPaymentReceipt?.[0] ? 'upload' : null,
      registrationCompleted: true
    };

    const registration = draft || new Registration(registrationPayload);
    Object.assign(registration, registrationPayload);
    await registration.save();
    await sendRegistrationConfirmation({ mailId, name, stopName: boardingPoint });
    res.status(201).json({
      message: 'Registration successful!',
      registrationId: registration._id,
      phase: registration.phase,
      finalFees: registration.finalFees
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/faculty', uploadMultiple, async (req, res) => {
  try {
    const registrationData = typeof req.body.registration === 'string'
      ? JSON.parse(req.body.registration)
      : req.body.registration;

    const {
      employeeId, name, dateOfBirth, category, designation,
      department, institution, address, pincode, boardingPoint,
      phoneNumber, emergencyPhoneNumber, mailId,
      guidelinesAccepted, instructionsAccepted,
      fullPaymentReceiptNumber, fullPaymentDate
    } = registrationData || req.body;

    if (!guidelinesAccepted || !instructionsAccepted) {
      return res.status(400).json({ message: 'You must accept both guidelines and instructions' });
    }

    const existing = await Registration.findOne({ employeeId, userType: 'faculty' });
    if (existing) {
      return res.status(400).json({ message: 'Faculty with this employee ID already registered' });
    }

    // Check email uniqueness
    const emailExists = await Registration.findOne({ mailId });
    if (emailExists) {
      return res.status(400).json({ message: 'This email is already used in another registration' });
    }

    const route = await Route.findOne({ 'stops.name': boardingPoint });
    if (!route) {
      return res.status(400).json({ message: 'Invalid boarding point' });
    }
    const stop = route.stops.find(s => s.name === boardingPoint);

    const registration = new Registration({
      userType: 'faculty',
      employeeId,
      name,
      dateOfBirth: new Date(dateOfBirth),
      category,
      designation,
      department,
      institution,
      address,
      pincode,
      boardingPoint,
      boardingPointRoute: route._id,
      boardingPointFees: stop.fees,
      distanceOrder: stop.distanceOrder,
      phoneNumber,
      emergencyPhoneNumber,
      mailId,
      guidelinesAccepted,
      instructionsAccepted,
      finalReceiptFile: req.files?.fullPaymentReceipt?.[0]?.filename || null,
      fullPaymentReceiptNumber: fullPaymentReceiptNumber || null,
      fullFeePaid: !!req.files?.fullPaymentReceipt?.[0],
      fullPaymentDate: fullPaymentDate ? new Date(fullPaymentDate) : null,
      finalConfirmationMethod: req.files?.fullPaymentReceipt?.[0] ? 'upload' : null
    });

    await registration.save();
    await sendRegistrationConfirmation({ mailId, name, stopName: boardingPoint });
    res.status(201).json({
      message: 'Faculty registration successful!',
      registrationId: registration._id,
      phase: registration.phase,
      finalFees: registration.finalFees,
      concession: '50%'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/staff', uploadMultiple, async (req, res) => {
  try {
    const registrationData = typeof req.body.registration === 'string'
      ? JSON.parse(req.body.registration)
      : req.body.registration;

    const {
      employeeId, name, dateOfBirth, category, designation,
      department, institution, address, pincode, boardingPoint,
      phoneNumber, emergencyPhoneNumber, mailId,
      guidelinesAccepted, instructionsAccepted,
      fullPaymentReceiptNumber, fullPaymentDate
    } = registrationData || req.body;

    if (!guidelinesAccepted || !instructionsAccepted) {
      return res.status(400).json({ message: 'You must accept both guidelines and instructions' });
    }

    const existing = await Registration.findOne({ employeeId, userType: 'staff' });
    if (existing) {
      return res.status(400).json({ message: 'Staff with this employee ID already registered' });
    }

    // Check email uniqueness
    const emailExists = await Registration.findOne({ mailId });
    if (emailExists) {
      return res.status(400).json({ message: 'This email is already used in another registration' });
    }

    const route = await Route.findOne({ 'stops.name': boardingPoint });
    if (!route) {
      return res.status(400).json({ message: 'Invalid boarding point' });
    }
    const stop = route.stops.find(s => s.name === boardingPoint);

    const registration = new Registration({
      userType: 'staff',
      employeeId,
      name,
      dateOfBirth: new Date(dateOfBirth),
      category,
      designation,
      department,
      institution,
      address,
      pincode,
      boardingPoint,
      boardingPointRoute: route._id,
      boardingPointFees: stop.fees,
      distanceOrder: stop.distanceOrder,
      phoneNumber,
      emergencyPhoneNumber,
      mailId,
      guidelinesAccepted,
      instructionsAccepted,
      finalReceiptFile: req.files?.fullPaymentReceipt?.[0]?.filename || null,
      fullPaymentReceiptNumber: fullPaymentReceiptNumber || null,
      fullFeePaid: !!req.files?.fullPaymentReceipt?.[0],
      fullPaymentDate: fullPaymentDate ? new Date(fullPaymentDate) : null,
      finalConfirmationMethod: req.files?.fullPaymentReceipt?.[0] ? 'upload' : null
    });

    await registration.save();
    await sendRegistrationConfirmation({ mailId, name, stopName: boardingPoint });
    res.status(201).json({
      message: 'Staff registration successful!',
      registrationId: registration._id,
      phase: registration.phase,
      finalFees: registration.finalFees,
      concession: '25%'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/status/:registerNumber', async (req, res) => {
  try {
    const registration = await Registration.findOne({
      registerNumber: req.params.registerNumber,
      userType: 'student'
    });

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    res.json({
      registrationId: registration._id,
      status: registration.status || 'pending',
      phase: registration.phase || 'awaiting_seat_allocation',
      finalFees: registration.finalFees,
      boardingPoint: registration.boardingPoint,
      advancePaid: registration.advancePaid,
      fullFeePaid: registration.fullFeePaid
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
