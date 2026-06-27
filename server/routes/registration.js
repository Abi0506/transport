const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const Registration = require('../models/Registration');
const Route = require('../models/Route');
const SponsoredStudent = require('../models/SponsoredStudent');
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
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadMultiple = upload.fields([
  { name: 'advanceReceipt', maxCount: 1 },
  { name: 'fullPaymentReceipt', maxCount: 1 }
]);

const sendRegistrationConfirmation = async ({ mailId, name, stopName, userType, employeeId }) => {
  if (!mailId) return;

  const subject = 'Transport Registration Confirmation - AY 2026-27';
  const isFacultyOrStaff = userType === 'faculty' || userType === 'staff';
  const isGovernmentSponsored = arguments[0]?.governmentSponsored || false;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background: #2f5ea8; color: #fff; padding: 16px; text-align: center; font-size: 24px; font-weight: 700;">
        Transport Section PSG iTech
      </div>
      <div style="padding: 24px; color: #222; line-height: 1.7;">
        <p>Dear ${name},</p>
        <p>Thank you for registering in the Transport App of PSGiTech for availing college bus during AY 2026-27.</p>
        ${isFacultyOrStaff ? `<p><strong>Your Staff ID:</strong> ${employeeId}</p>` : ''}
        ${!isFacultyOrStaff ? `<p><strong>Your login credentials are:</strong></p>
        <p style="margin-left: 16px;">
          User name: Register Number / D.No.<br />
          Password: Date of Birth (yyyymmdd)
        </p>
        ${isGovernmentSponsored ? `<p><strong>Government Sponsored Scholarship:</strong> You are exempt from the ₹5,000 advance payment. No receipt upload is required during registration.</p>` : `<p><strong>Advance Payment:</strong> ₹5,000 must be paid in advance (cash at office). This amount is refundable as per transport rules.</p>`}` : ''}
        <p>Allocation will be done based on your boarding point and the distance matrix.</p>
        <p>If you are allotted a seat, you will receive an allocation mail regarding bus fees, payment date, bus route number, and other procedures.</p>
        <p><strong>Important:</strong> Please refer to the Transport Guidelines for detailed information.</p>

        <div style="margin-top:18px; padding:12px; background:#f7f9fc; border-radius:6px;">
          <h3 style="margin:6px 0; font-size:18px;">View your profile</h3>
          <p>You can view your profile at the following link:</p>
          <p><a href="https://sdc2.psgitech.ac.in/transport/#/login">https://sdc2.psgitech.ac.in/transport/#/login</a></p>
          ${isFacultyOrStaff ? `
            <p>For faculty/staff: select <strong>Faculty/Staff</strong> then enter your <strong>staff ID</strong> as the username. Use your Date of Birth (YYYYMMDD) to login if prompted for a password.</p>
          ` : `
            <p>For students: select <strong>Student</strong> then enter your <strong>Registration Number</strong> as username and your <strong>Date of Birth (YYYYMMDD)</strong> as the password.</p>
          `}
        </div>

        <p style="margin-top:12px;">Thank you</p>
        <p>With Regards<br />Team Transport</p>
      </div>
    </div>
  `;

  await sendMail(mailId, subject, html);
};

const normalizeMailId = (mailId) => (mailId || '').toString().trim().toLowerCase();

const handleDuplicateEmailError = (error, res) => {
  if (error?.code === 11000 && (error?.keyPattern?.mailId || error?.keyValue?.mailId)) {
    res.status(400).json({ message: 'Email already exists' });
    return true;
  }
  return false;
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
    // Log grouped routes to server console for debugging / visibility
    try {
      console.log('GET /api/register/boarding-points - grouped routes:\n', JSON.stringify(grouped, null, 2));
    } catch (e) {
      console.log('GET /api/register/boarding-points - grouped routes (truncated):', grouped);
    }

    res.json(grouped);
  } catch (error) {
    if (handleDuplicateEmailError(error, res)) return;
    res.status(500).json({ message: error.message });
  }
});

// Check if advance payment exists for a roll number
router.get('/check-advance/:registerNumber', async (req, res) => {
  try {
    const { registerNumber } = req.params;
    const Payment = require('../models/Payment');

    // If student is in government sponsored list, treat as exempt (advance considered satisfied)
    const sponsored = await SponsoredStudent.findOne({ registerNumber: registerNumber });
    if (sponsored) {
      return res.json({ advancePaid: true, alreadyRegistered: false, governmentSponsored: true });
    }

    const payment = await Payment.findOne({ rollNumber: registerNumber, paidStatus: 'confirmed' });
    if (payment) {
      return res.json({ advancePaid: true, alreadyRegistered: false });
    }

    res.json({ advancePaid: false, alreadyRegistered: false });
  } catch (error) {
    if (handleDuplicateEmailError(error, res)) return;
    res.status(500).json({ message: error.message });
  }
});

router.get('/check-duplicate', async (req, res) => {
  try {
    const { field, value, userType, includeDrafts } = req.query;
    const trimmedValue = (value || '').toString().trim();

    if (!field || !trimmedValue) {
      return res.status(400).json({ message: 'Field and value are required' });
    }

    let query;
    if (field === 'mailId') {
      // Normalize email to lowercase for case-insensitive matching
      query = { mailId: normalizeMailId(trimmedValue) };
    } else if (field === 'employeeId') {
      query = { employeeId: trimmedValue.toLowerCase() };
    } else if (field === 'registerNumber') {
      query = { registerNumber: trimmedValue };
    } else {
      return res.status(400).json({ message: 'Invalid field' });
    }

    // By default, duplicate checks only consider confirmed registrations.
    // Pass includeDrafts=true only when draft matching is explicitly needed.
    if (includeDrafts !== 'true') {
      query.registrationCompleted = true;
    }

    if (userType) {
      query.userType = userType;
    }

    const registration = await Registration.findOne(query);
    res.json({ exists: !!registration });
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
      advanceReceiptNumber,
      fullPaymentReceiptNumber, fullPaymentDate,
      governmentSponsored: governmentSponsoredFlag,
      advancePaymentDecision
    } = registrationData || req.body;

    const normalizedRegisterNumber = (registerNumber || '').toString().trim();
    const normalizedMailId = normalizeMailId(mailId);
    const isGovernmentSponsored = governmentSponsoredFlag === true || advancePaymentDecision === 'sponsored';

    if (!guidelinesAccepted || !instructionsAccepted) {
      return res.status(400).json({ message: 'You must accept both guidelines and instructions' });
    }

    const existingByRegisterNumber = await Registration.findOne({
      userType: 'student',
      registerNumber: normalizedRegisterNumber,
      registrationCompleted: true
    });
    const draft = await Registration.findOne({
      userType: 'student',
      registerNumber: normalizedRegisterNumber,
      registrationCompleted: false
    });

    if (existingByRegisterNumber) {
      return res.status(400).json({ message: 'Student with this register number already registered' });
    }
    // Duplicate email is allowed by requirement; registerNumber is the primary key for students.

    const route = await Route.findOne({ 'stops.name': boardingPoint });
    if (!route) {
      return res.status(400).json({ message: 'Invalid boarding point' });
    }
    const stop = route.stops.find(s => s.name === boardingPoint);
    const Payment = require('../models/Payment');
    const normalizedAdvanceReceiptNumber = (advanceReceiptNumber || '').trim();
    const payment = await Payment.findOne({
      rollNumber: normalizedRegisterNumber,
      receiptNumber: normalizedAdvanceReceiptNumber,
      paidStatus: 'confirmed'
    });

      // If student is government sponsored, skip payment validation
      const sponsored = isGovernmentSponsored
        ? { registerNumber: normalizedRegisterNumber, name: name || 'Government Sponsored Scholarship' }
        : await SponsoredStudent.findOne({ registerNumber: normalizedRegisterNumber });
      if (!sponsored && !payment) {
        return res.status(400).json({ message: 'Advance payment must match the register number and receipt number recorded in office payments' });
      }

    const registrationPayload = {
      userType: 'student',
      registerNumber: normalizedRegisterNumber,
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
      mailId: normalizedMailId,
      guidelinesAccepted,
      instructionsAccepted,
      receiptFile: req.files?.advanceReceipt?.[0]?.filename || (payment && payment.receiptFile) || null,
      advanceReceiptNumber: sponsored ? null : (payment && payment.receiptNumber) || null,
      advancePaid: !!payment || !!sponsored,
      advanceConfirmationMethod: sponsored ? 'sponsored' : (payment && payment.confirmationMethod) || 'manual',
      finalReceiptFile: req.files?.fullPaymentReceipt?.[0]?.filename || null,
      fullPaymentReceiptNumber: fullPaymentReceiptNumber || null,
      fullFeePaid: !!req.files?.fullPaymentReceipt?.[0],
      fullPaymentDate: fullPaymentDate ? new Date(fullPaymentDate) : null,
      finalConfirmationMethod: req.files?.fullPaymentReceipt?.[0] ? 'upload' : null,
      governmentSponsored: !!sponsored,
      sponsorshipDetails: sponsored ? (sponsored.name || 'Government Sponsored Scholarship') : null,
      registrationCompleted: true
    };

    const registration = draft || new Registration(registrationPayload);
    Object.assign(registration, registrationPayload);
    await registration.save();

    if (payment && (!payment.registration || String(payment.registration) !== String(registration._id))) {
      payment.registration = registration._id;
      await payment.save();
    }

    await sendRegistrationConfirmation({ mailId, name, stopName: boardingPoint, userType: 'student', governmentSponsored: !!sponsored });
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
      employeeId, name, dateOfBirth, designation,
      department, institution, address, pincode, boardingPoint,
      phoneNumber, emergencyPhoneNumber, mailId,
      guidelinesAccepted, instructionsAccepted,
      fullPaymentReceiptNumber, fullPaymentDate
    } = registrationData || req.body;

    const normalizedMailId = normalizeMailId(mailId);
    const normalizedEmployeeId = (employeeId || '').toString().trim().toLowerCase();

    if (!guidelinesAccepted || !instructionsAccepted) {
      return res.status(400).json({ message: 'You must accept both guidelines and instructions' });
    }

    const expectedDomain = institution === 'PSG IAP' ? '@psgiap.ac.in' : '@psgitech.ac.in';
    if (!normalizedMailId.endsWith(expectedDomain)) {
      return res.status(400).json({ message: `Faculty email must be from ${expectedDomain.slice(1)} domain` });
    }

    const existingEmployee = await Registration.findOne({
      userType: 'faculty',
      employeeId: normalizedEmployeeId,
      registrationCompleted: true
    });
    if (existingEmployee) {
      return res.status(400).json({ message: 'Faculty with this employee ID already registered' });
    }

    // Duplicate email is allowed by requirement; employeeId is the primary key for faculty.
    const draft = await Registration.findOne({
      userType: 'faculty',
      employeeId: normalizedEmployeeId,
      registrationCompleted: false
    });

    const route = await Route.findOne({ 'stops.name': boardingPoint });
    if (!route) {
      return res.status(400).json({ message: 'Invalid boarding point' });
    }
    const stop = route.stops.find(s => s.name === boardingPoint);
    
    const registrationPayload = {
      userType: 'faculty',
      employeeId: normalizedEmployeeId,
      name,
      dateOfBirth: new Date(dateOfBirth),
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
      mailId: normalizedMailId,
      guidelinesAccepted,
      instructionsAccepted,
      finalReceiptFile: req.files?.fullPaymentReceipt?.[0]?.filename || null,
      fullPaymentReceiptNumber: fullPaymentReceiptNumber || null,
      fullFeePaid: !!req.files?.fullPaymentReceipt?.[0],
      fullPaymentDate: fullPaymentDate ? new Date(fullPaymentDate) : null,
      finalConfirmationMethod: req.files?.fullPaymentReceipt?.[0] ? 'upload' : null,
      registrationCompleted: true
    };

    const registration = draft || new Registration(registrationPayload);
    Object.assign(registration, registrationPayload);
    
    // Auto-generate static credentials for faculty
    const bcrypt = require('bcryptjs');
    registration.loginUsername = normalizedEmployeeId;
    registration.loginPasswordHash = await bcrypt.hash(normalizedEmployeeId, 10); // Use employeeId as password
    
    await registration.save();
    await sendRegistrationConfirmation({ mailId, name, stopName: boardingPoint, userType: 'faculty', employeeId: registration.employeeId });
    res.status(201).json({
      message: 'Faculty registration successful!',
      registrationId: registration._id,
      employeeId: registration.employeeId,
      phase: registration.phase,
      finalFees: registration.finalFees,
      concession: '50%',
      loginUsername: registration.loginUsername
    });
  } catch (error) {
    console.error('Faculty registration error:', error);
    if (handleDuplicateEmailError(error, res)) return;
    res.status(500).json({ message: error.message });
  }
});

router.post('/staff', uploadMultiple, async (req, res) => {
  try {
    const registrationData = typeof req.body.registration === 'string'
      ? JSON.parse(req.body.registration)
      : req.body.registration;

    const {
      employeeId, name, dateOfBirth, designation,
      department, institution, address, pincode, boardingPoint,
      phoneNumber, emergencyPhoneNumber, mailId,
      guidelinesAccepted, instructionsAccepted,
      fullPaymentReceiptNumber, fullPaymentDate
    } = registrationData || req.body;

    const normalizedMailId = normalizeMailId(mailId);

    if (!guidelinesAccepted || !instructionsAccepted) {
      return res.status(400).json({ message: 'You must accept both guidelines and instructions' });
    }

    const existing = await Registration.findOne({
      userType: 'staff',
      employeeId,
      registrationCompleted: true
    });
    if (existing) {
      return res.status(400).json({ message: 'Staff with this employee ID already registered' });
    }

    // Duplicate email is allowed by requirement; employeeId is the primary key for staff.
    const draft = await Registration.findOne({
      userType: 'staff',
      employeeId,
      registrationCompleted: false
    });

    const route = await Route.findOne({ 'stops.name': boardingPoint });
    if (!route) {
      return res.status(400).json({ message: 'Invalid boarding point' });
    }
    const stop = route.stops.find(s => s.name === boardingPoint);
    
    const registrationPayload = {
      userType: 'staff',
      employeeId,
      name,
      dateOfBirth: new Date(dateOfBirth),
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
      mailId: normalizedMailId,
      guidelinesAccepted,
      instructionsAccepted,
      finalReceiptFile: req.files?.fullPaymentReceipt?.[0]?.filename || null,
      fullPaymentReceiptNumber: fullPaymentReceiptNumber || null,
      fullFeePaid: !!req.files?.fullPaymentReceipt?.[0],
      fullPaymentDate: fullPaymentDate ? new Date(fullPaymentDate) : null,
      finalConfirmationMethod: req.files?.fullPaymentReceipt?.[0] ? 'upload' : null,
      registrationCompleted: true
    };

    const registration = draft || new Registration(registrationPayload);
    Object.assign(registration, registrationPayload);
    
    // Auto-generate static credentials for staff
    const bcrypt = require('bcryptjs');
    registration.loginUsername = employeeId;
    registration.loginPasswordHash = await bcrypt.hash(employeeId, 10); // Use employeeId as password
    
    await registration.save();
    await sendRegistrationConfirmation({ mailId, name, stopName: boardingPoint, userType: 'staff', employeeId: registration.employeeId });
    res.status(201).json({
      message: 'Staff registration successful!',
      registrationId: registration._id,
      employeeId: registration.employeeId,
      phase: registration.phase,
      finalFees: registration.finalFees,
      concession: '80%',
      loginUsername: registration.loginUsername
    });
  } catch (error) {
    console.error('Staff registration error:', error);
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
    if (handleDuplicateEmailError(error, res)) return;
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
