const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const Registration = require('../models/Registration');
const Payment = require('../models/Payment');
const Suggestion = require('../models/Suggestion');
const bcrypt = require('bcryptjs');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Apply admin auth to all routes
router.use(authMiddleware, adminMiddleware);

// ============ STATS & OVERVIEW ============

// Get overall stats
router.get('/stats', async (req, res) => {
  try {
    const routes = await Route.find({ isActive: true });
    const totalCapacity = routes.reduce((sum, r) => sum + r.capacity, 0);

    const [totalRegistrations, facultyCount, staffCount, studentsByYear] = await Promise.all([
      Registration.countDocuments(),
      Registration.countDocuments({ userType: 'faculty' }),
      Registration.countDocuments({ userType: 'staff' }),
      Registration.aggregate([
        { $match: { userType: 'student' } },
        { $group: { _id: '$academicYear', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    const allocatedCount = await Registration.countDocuments({ registrationStatus: 'allocated' });
    const pendingCount = await Registration.countDocuments({ registrationStatus: 'pending', cancellationRequested: { $ne: true } });
    const paidCount = await Registration.countDocuments({ advancePaid: true });

    res.json({
      totalCapacity,
      totalRoutes: routes.length,
      totalRegistrations,
      allocatedCount,
      pendingCount,
      paidCount,
      facultyCapacity: Math.floor(totalCapacity * 0.09),
      staffCapacity: Math.floor(totalCapacity * 0.06),
      studentCapacity: Math.floor(totalCapacity * 0.85),
      facultyCount,
      staffCount,
      studentsByYear: studentsByYear.reduce((acc, s) => { acc[`year${s._id}`] = s.count; return acc; }, {}),
      studentTotal: totalRegistrations - facultyCount - staffCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ ROUTE OVERVIEW ============

// Get all routes with detailed counts
router.get('/routes', async (req, res) => {
  try {
    const routes = await Route.find({ isActive: true }).sort({ routeNumber: 1 });

    const routeData = await Promise.all(routes.map(async (route) => {
      // Get all registrations for this route's stops
      const stopNames = route.stops.map(s => s.name);
      const registrations = await Registration.find({
        boardingPoint: { $in: stopNames },
        boardingPointRoute: route._id
      });

      // Counts by userType — apply rule: include commuters who are "registered" (registrationCompleted)
      // and for students require a confirmed payment. Faculty/staff are included if registered.
      const facultyAll = registrations.filter(r => r.userType === 'faculty' && r.registrationCompleted).length;
      const staffAll = registrations.filter(r => r.userType === 'staff' && r.registrationCompleted).length;

      // Find confirmed payments for registrations on this route
      const regIds = registrations.map(r => r._id).filter(Boolean);
      const confirmedPayments = await Payment.find({ registration: { $in: regIds }, paidStatus: 'confirmed' }).select('registration').lean();
      const confirmedRegSet = new Set(confirmedPayments.map(p => String(p.registration)));

      // Students are counted only if registrationCompleted and payment confirmed
      const studentsConfirmedRegs = registrations.filter(r => r.userType === 'student' && r.registrationCompleted && confirmedRegSet.has(String(r._id)));
      const studentsConfirmed = studentsConfirmedRegs.length;
      
      const studentsByYear = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      studentsConfirmedRegs.forEach(r => {
        if (r.academicYear >= 1 && r.academicYear <= 5) {
          studentsByYear[r.academicYear]++;
        }
      });

      const facultyCount = facultyAll;
      const staffCount = staffAll;
      const studentTotal = studentsConfirmed;

      // Total commuters considered for seating
      const totalCommuters = facultyCount + staffCount + studentTotal;

      // Percent metrics
      const facultyPercent = route.capacity > 0 ? Math.round((facultyCount / route.capacity) * 100) : 0;
      const staffPercent = route.capacity > 0 ? Math.round((staffCount / route.capacity) * 100) : 0;
      const studentPercent = route.capacity > 0 ? Math.round((studentTotal / route.capacity) * 100) : 0;

      const facultyPercentOfCommuters = totalCommuters > 0 ? Math.round((facultyCount / totalCommuters) * 100) : 0;
      const staffPercentOfCommuters = totalCommuters > 0 ? Math.round((staffCount / totalCommuters) * 100) : 0;
      const studentPercentOfCommuters = totalCommuters > 0 ? Math.round((studentTotal / totalCommuters) * 100) : 0;

      const allocatedCount = registrations.filter(r => r.registrationStatus === 'allocated').length;
      const needAllocationCount = registrations.filter(r => r.advancePaid && ['pending', 'waitlisted'].includes(r.registrationStatus) && !r.cancellationRequested).length;

      // Stop-level counts
      const stopCounts = route.stops.map(stop => {
        const stopRegs = registrations.filter(r => r.boardingPoint === stop.name);
        return {
          name: stop.name,
          fees: stop.fees,
          time: stop.time,
          distanceOrder: stop.distanceOrder,
          totalCount: stopRegs.length,
          facultyCount: stopRegs.filter(r => r.userType === 'faculty').length,
          staffCount: stopRegs.filter(r => r.userType === 'staff').length,
          studentCount: stopRegs.filter(r => r.userType === 'student').length
        };
      });

      return {
        _id: route._id,
        routeNumber: route.routeNumber,
        routeName: route.routeName,
        capacity: route.capacity,
        allocatedCount,
        needAllocationCount,
        occupancyPercent: route.capacity > 0 ? Math.round((totalCommuters / route.capacity) * 100) : 0,
        facultyCount,
        staffCount,
        // totalRegistered & occupancyPercent now reflect commuters considered for seating
        totalRegistered: totalCommuters,
        commuterSplit: {
          students: { count: studentTotal, percentOfCapacity: studentPercent, percentOfCommuters: studentPercentOfCommuters, byYear: studentsByYear },
          faculty: { count: facultyCount, percentOfCapacity: facultyPercent, percentOfCommuters: facultyPercentOfCommuters },
          staff:   { count: staffCount,   percentOfCapacity: staffPercent,   percentOfCommuters: staffPercentOfCommuters }
        },
        facultyPercent,
        staffPercent,
        studentPercent,
        stops: stopCounts
      };
    }));

    res.json(routeData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ STOP DETAIL ============

// Get registrations for a specific stop in a route
router.get('/route/:routeId/stop/:stopName/registrations', async (req, res) => {
  try {
    const { routeId, stopName } = req.params;
    const registrations = await Registration.find({
      boardingPointRoute: routeId,
      boardingPoint: decodeURIComponent(stopName)
    }).sort({ createdAt: -1 });

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route-wise allocation views
router.get('/route/:routeId/view', async (req, res) => {
  try {
    const { routeId } = req.params;
    const { view = 'allocated' } = req.query;

    const query = { boardingPointRoute: routeId };
    if (view === 'allocated') {
      query.registrationStatus = 'allocated';
    } else if (view === 'need-allocation') {
      query.advancePaid = true;
      query.registrationStatus = { $in: ['pending', 'waitlisted'] };
      query.cancellationRequested = { $ne: true };
    }

    const registrations = await Registration.find(query)
      .sort({ distanceOrder: 1, createdAt: 1 });

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ REJECT ALLOCATION ============

router.post('/reject/:registrationId', async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    registration.registrationStatus = 'rejected';
    registration.allocatedRoute = null;
    registration.allocatedStop = null;
    await registration.save();

    if (registration.mailId) {
      sendMail(registration.mailId, 'Deallocation of Transport Seat', buildDeallocationMail(registration, 'Seat deallocated/rejected by admin'));
    }

    res.json({ message: `Allocation rejected for ${registration.name}`, registration });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ BLOCK USER ============

router.post('/block/:registrationId', async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    registration.isBlocked = !registration.isBlocked;
    if (registration.isBlocked) {
      registration.registrationStatus = 'rejected';
      registration.allocatedRoute = null;
      registration.allocatedStop = null;
    }
    await registration.save();

    res.json({ message: `User ${registration.name} is now ${registration.isBlocked ? 'blocked' : 'unblocked'}`, registration });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ LOGIN CREDENTIALS ============

router.post('/credentials', async (req, res) => {
  try {
    const { rollNumber, loginUsername, password } = req.body;

    if (!rollNumber || !loginUsername || !password) {
      return res.status(400).json({ message: 'Roll number/staff ID, username, and password are required' });
    }

    const registration = await Registration.findOne({
      $or: [{ registerNumber: rollNumber.trim() }, { employeeId: rollNumber.trim() }]
    });

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    const existingUsername = await Registration.findOne({
      loginUsername: loginUsername.trim(),
      _id: { $ne: registration._id }
    });

    if (existingUsername) {
      return res.status(400).json({ message: 'This username is already in use' });
    }

    registration.loginUsername = loginUsername.trim();
    registration.loginPasswordHash = await bcrypt.hash(password, 10);
    await registration.save();

    res.json({
      message: 'Login credentials saved successfully',
      registrationId: registration._id,
      loginUsername: registration.loginUsername
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ ADVANCE PAYMENT EDITOR ============

router.get('/payments', async (req, res) => {
  try {
    const { status, rollNumber, receiptNumber, search, limit = 100 } = req.query;
    const query = {};

    if (status) query.paidStatus = status;
    if (rollNumber) query.rollNumber = rollNumber.trim();
    if (receiptNumber) query.receiptNumber = receiptNumber.trim();
    if (search) {
      const trimmedSearch = search.trim();
      const escapedSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { rollNumber: { $regex: escapedSearch, $options: 'i' } },
        { receiptNumber: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    const payments = await Payment.find(query)
      .populate('registration', 'name registerNumber employeeId userType')
      .sort({ confirmedAt: -1, updatedAt: -1, createdAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 100, 500));

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/payments/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { rollNumber, receiptNumber, paymentDate } = req.body;

    const payment = await Payment.findById(paymentId).populate('registration');
    if (!payment) {
      return res.status(404).json({ message: 'Advance payment record not found' });
    }

    const nextRollNumber = typeof rollNumber === 'string' ? rollNumber.trim() : '';
    const nextReceiptNumber = typeof receiptNumber === 'string' ? receiptNumber.trim() : '';
    const nextPaymentDate = paymentDate ? new Date(paymentDate) : null;

    if (!nextRollNumber) {
      return res.status(400).json({ message: 'Roll number is required' });
    }
    if (!nextReceiptNumber) {
      return res.status(400).json({ message: 'Receipt number is required' });
    }
    if (!nextPaymentDate || Number.isNaN(nextPaymentDate.getTime())) {
      return res.status(400).json({ message: 'Valid payment date is required' });
    }

    const existingReceipt = await Payment.findOne({ receiptNumber: nextReceiptNumber, _id: { $ne: payment._id } });
    if (existingReceipt) {
      return res.status(400).json({ message: 'Receipt number is already used by another payment record' });
    }

    const linkedRegistration = payment.registration || await Registration.findOne({
      $or: [{ registerNumber: payment.rollNumber }, { employeeId: payment.rollNumber }]
    });

    if (linkedRegistration) {
      const registrationQuery = linkedRegistration.userType === 'student'
        ? { registerNumber: nextRollNumber, _id: { $ne: linkedRegistration._id } }
        : { employeeId: nextRollNumber, _id: { $ne: linkedRegistration._id } };
      const duplicateRegistration = await Registration.findOne(registrationQuery);
      if (duplicateRegistration) {
        return res.status(400).json({ message: 'Roll number is already used by another registration' });
      }
    }

    payment.rollNumber = nextRollNumber;
    payment.receiptNumber = nextReceiptNumber;
    payment.paymentDate = nextPaymentDate;
    if (payment.paidStatus !== 'confirmed') {
      payment.paidStatus = 'confirmed';
    }
    if (!payment.confirmationMethod) {
      payment.confirmationMethod = 'manual';
    }
    payment.confirmedAt = payment.confirmedAt || new Date();
    await payment.save();

    if (linkedRegistration) {
      if (linkedRegistration.userType === 'student') {
        linkedRegistration.registerNumber = nextRollNumber;
      } else {
        linkedRegistration.employeeId = nextRollNumber;
      }
      linkedRegistration.advanceReceiptNumber = nextReceiptNumber;
      linkedRegistration.receiptFile = payment.receiptFile || linkedRegistration.receiptFile;
      await linkedRegistration.save();
    }

    const updatedPayment = await Payment.findById(payment._id).populate('registration', 'name registerNumber employeeId userType');
    res.json({ message: 'Advance payment updated successfully', payment: updatedPayment });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: 'Receipt number already exists' });
    }
    res.status(500).json({ message: error.message });
  }
});

// ============ EDIT STOPS ============

router.put('/route/:routeId/stops', async (req, res) => {
  try {
    const { stops, capacity } = req.body;
    const route = await Route.findById(req.params.routeId);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    
    route.stops = stops;
    if (capacity !== undefined) {
      route.capacity = Number(capacity);
    }
    await route.save();
    
    res.json({ message: 'Route updated successfully', route });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const { sendMail } = require('../utils/mailer');

const buildRegistrationMail = (registration) => `
  <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <div style="background: #2f5ea8; color: #fff; padding: 16px; text-align: center; font-size: 24px; font-weight: 700;">
      Transport Section PSG iTech
    </div>
    <div style="padding: 24px; color: #222; line-height: 1.7;">
      <p>Dear ${registration.name},</p>
      <p>Thank you for registering in the Transport App of PSGiTech for availing college bus during AY 2026-27 from the stop <strong>${registration.boardingPoint}</strong>.</p>
      <p><strong>Your login credentials are:</strong></p>
      <p style="margin-left: 16px;">User name: Register Number / D.No.<br />Password: Date of Birth (yyyymmdd)</p>
      
      <p>Allocation will be done based on your boarding point and the distance matrix.</p>
      <p>If you are allotted a seat, you will receive an allocation mail regarding bus fees, payment date, bus route number, and other procedures.</p>
      <p><strong>Important:</strong> Please refer to the Transport Guidelines for detailed information.</p>
      <p>You can share your suggestions in: <a href="http://localhost:7078app/suggestion">http://localhost:7078app/suggestion</a></p>
      <p>Thank you<br />With Regards<br />Team Transport</p>
    </div>
  </div>
`;

const buildUnallocatedMail = (registration) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #374151; line-height: 1.6;">
    <h2 style="color: #1d4ed8; margin-bottom: 5px; font-size: 22px; font-weight: bold;">Transport Section PSG iTech</h2>
    <hr style="border: 0; border-top: 1px solid #d1d5db; margin-bottom: 20px;" />
    
    <p>Dear ${registration.name}</p>
    <p><strong>Greetings of the Day !</strong></p>
    <p>We regret to inform you that the Transport section of PSGiTech could not provide you a seat in college bus due to the specified guidelines of institution .</p>
    
    <p><strong>Requested Boarding Point:</strong> ${registration.boardingPoint || 'N/A'}</p>
    <p><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">Not Allocated</span></p>
    
    ${registration.userType === 'student' ? `
      <p style="margin-top: 15px; padding: 10px; background-color: #fef2f2; border-left: 4px solid #dc2626; color: #991b1b; font-weight: bold;">
        Advance payment of ₹5,000 will be refunded fully on or before September 10, 2026.
      </p>
    ` : ''}

    <p style="margin-top: 20px; font-weight: bold;">For Further Clarification:</p>
    <p style="margin: 4px 0;"><strong>Contact:</strong> Dr.S.Maruthamuthu, Prof & Head Physics - Transport Incharge</p>
    <p style="margin: 4px 0;"><strong>Location:</strong> E7 302</p>
    
    <p style="margin-top: 20px;">Thank you</p>
    <p style="margin: 0; font-weight: bold;">With Regards,</p>
    <p style="margin: 0; font-weight: bold;">Team Transport</p>
  </div>
`;

const buildPaidMail = (registration) => {
  const receiptNum = registration.advanceReceiptNumber || 'N/A';
  const paymentDate = registration.updatedAt ? new Date(registration.updatedAt).toLocaleDateString() : 'N/A';
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #1d4ed8; text-align: center; margin-bottom: 5px; font-size: 22px; font-weight: bold;">Transport Section PSG iTech</h2>
      <hr style="border: 0; border-top: 1px solid #d1d5db; margin-bottom: 20px;" />
      <p style="font-size: 15px; color: #374151;">Dear ${registration.name},</p>
      <p style="font-size: 15px; color: #374151; font-weight: bold;">Greetings of the Day !</p>
      <p style="font-size: 15px; color: #374151; line-height: 1.5;">We are pleased to inform you that your transport fee payment has been successfully confirmed.</p>
      
      <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px; color: #374151;">
          <tbody>
            <tr style="height: 30px;"><td style="font-weight: bold; width: 40%;">Payment Status:</td><td style="color: #059669; font-weight: bold;">Confirmed</td></tr>
            <tr style="height: 30px;"><td style="font-weight: bold;">Receipt Number:</td><td>${receiptNum}</td></tr>
            <tr style="height: 30px;"><td style="font-weight: bold;">Date of Verification:</td><td>${paymentDate}</td></tr>
          </tbody>
        </table>
      </div>
      
      <p style="font-size: 14px; color: #374151; line-height: 1.5;">You can now present this confirmation email or your physical payment receipt to the Transport Office to collect your **BUS PASS**.</p>
      
      <p style="font-size: 14px; color: #374151; margin-top: 20px;">Thank you</p>
      <p style="font-size: 14px; color: #374151; font-weight: bold; margin: 0;">With Regards,</p>
      <p style="font-size: 14px; color: #374151; font-weight: bold; margin: 0;">Team Transport</p>
    </div>
  `;
};

const buildAllocationMail = (registration, route, options = {}) => {
  const fromMonth = options.fromMonth || 'August 2026';
  const toMonth = options.toMonth || 'July 2027';
  const deadline = options.deadline || '31.07.2026 Friday';
  const venue = options.venue || 'iTech Office, E1 block Ground floor , Room No 102';
  const modeOfPayment = options.modeOfPayment || 'Cash / DD (Favoring: The Principal, PSG Institute of Technology and Applied Research, Payable at Coimbatore)';

  const routeName = `Route ${route.routeNumber} - ${route.routeName}`;
  const boardingPoint = registration.allocatedStop || registration.boardingPoint;
  const isStudent = registration.userType === 'student';
  const isSponsored = registration.governmentSponsored === true;
  const totalFees = Math.round(registration.finalFees || registration.boardingPointFees );

  if (isStudent) {
    if (isSponsored) {
      // 1. Reservation (Government Sponsored Category)
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #374151; line-height: 1.6;">
          <h2 style="color: #1d4ed8; text-align: center; margin-bottom: 5px; font-size: 22px; font-weight: bold;">Transport Section PSG iTech</h2>
          <hr style="border: 0; border-top: 1px solid #d1d5db; margin-bottom: 20px;" />
          
          <p>Dear ${registration.name}</p>
          <p><strong>Greetings of the Day !</strong></p>
          <p>Transport section of PSGiTech is happy to <span style="background-color: #f59e0b; color: #000; padding: 2px 6px; border-radius: 3px; font-weight: bold;">ALLOCATE</span> you a seat in college bus based on your chosen boarding point.</p>
          
          <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
              <tbody>
                <tr style="height: 30px;"><td style="font-weight: bold; width: 40%;">Bus Route:</td><td>${routeName}</td></tr>
                <tr style="height: 30px;"><td style="font-weight: bold;">Boarding Point:</td><td>${boardingPoint}</td></tr>
                <tr style="height: 30px;"><td style="font-weight: bold;">Annual Bus Fee:</td><td>₹ 0 ( 7.5  Govt sponsored Category )</td></tr>
              </tbody>
            </table>
          </div>
          
          <p style="font-weight: bold; margin-bottom: 8px;">Procedure to be followed:</p>
          <p style="margin-left: 10px;">a. Show the allocation mail in Transport Office and get your BUS PASS ( Only student, No Parents ) - Dates will be informed through Whatsapp group.</p>
          
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; color: #b45309;">
            <p style="margin: 0 0 6px 0; font-weight: bold;">Important Notes:</p>
            <ol style="margin: 0; padding-left: 20px; font-size: 13.5px;">
              <li style="margin-bottom: 4px;">Your Seat will be <strong>CONFIRMED</strong> only after receiving the bus pass on or before 01.09.2026.</li>
              <li style="margin-bottom: 4px;">If Not, your allotted seat stays <strong>CANCELLED</strong> and it will be allocated to the other registered commuter.</li>
              <li style="margin-bottom: 4px;">From 1st September 2026 <strong>NEW BUS PASS</strong> is mandatory for boarding all the college bus.</li>
            </ol>
          </div>
          
          <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 12px; margin: 20px 0; border-radius: 4px; color: #0369a1; font-size: 13.5px;">
            <p style="margin: 0 0 6px 0; font-weight: bold;">WhatsApp group link</p>
            <p style="margin: 8px 0 10px 0;">
              <a href="https://chat.whatsapp.com/GceII176FFT3ZW1KdFzgVS" target="_blank" style="display: inline-block; background-color: #25d366; color: #ffffff; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px;">Join WhatsApp Group</a>
            </p>
            <p style="margin: 4px 0;">✅ Only student with their own mobile number should join the  iTech Bus 26-27  Group.</p>
            <p style="margin: 4px 0; color: #b91c1c; font-weight: bold;">❌ Parents Don't join in this group.</p>
          </div>
          
          <p style="margin-top: 20px;">Thank you</p>
          <p style="margin: 0; font-weight: bold;">With Regards,</p>
          <p style="margin: 0; font-weight: bold;">Team Transport</p>
        </div>
      `;
    } else {
      // 2. Regular Student
      const payableFees = Math.max(0, totalFees - 5000);
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #374151; line-height: 1.6;">
          <h2 style="color: #1d4ed8; text-align: center; margin-bottom: 5px; font-size: 22px; font-weight: bold;">Transport Section PSG iTech</h2>
          <hr style="border: 0; border-top: 1px solid #d1d5db; margin-bottom: 20px;" />
          
          <p>Dear ${registration.name}</p>
          <p><strong>Greetings of the Day !</strong></p>
          <p>Transport section of PSGiTech is happy to <strong>ALLOCATE</strong> you a seat in college bus based on your chosen boarding point.</p>
          
          <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
              <tbody>
                <tr style="height: 30px;"><td style="font-weight: bold; width: 45%;">Bus Route:</td><td>${routeName}</td></tr>
                <tr style="height: 30px;"><td style="font-weight: bold;">Boarding Point:</td><td>${boardingPoint}</td></tr>
                <tr style="height: 30px;"><td style="font-weight: bold;">Duration:</td><td>From ${fromMonth} To ${toMonth}</td></tr>
                <tr style="height: 30px;"><td style="font-weight: bold;">Annual Bus Fee:</td><td>₹${totalFees.toLocaleString()}</td></tr>
                <tr style="height: 30px;"><td style="font-weight: bold; color: #0284c7;">Balance Payable Fee (Annual Bus Fee - ₹5,000 advance):</td><td style="color: #0284c7; font-weight: bold;">₹${payableFees.toLocaleString()}</td></tr>
                <tr style="height: 30px;"><td style="font-weight: bold;">Date of Payment:</td><td>On or Before ${deadline}</td></tr>
                <tr style="height: 45px; vertical-align: top;"><td style="font-weight: bold; padding-top: 5px;">Mode of Payment:</td><td style="padding-top: 5px; line-height: 1.4;">${modeOfPayment}</td></tr>
                <tr style="height: 35px; vertical-align: top;"><td style="font-weight: bold; padding-top: 5px;">Venue:</td><td style="padding-top: 5px;">${venue}</td></tr>
              </tbody>
            </table>
          </div>
          
          <p style="font-weight: bold; margin-bottom: 8px;">Procedure to be followed:</p>
          <ol style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 6px;">Pay the bus fees before the mentioned date and get the RECEIPT.</li>
            <li style="margin-bottom: 6px;">Enter the Fees receipt number, Date of Payment, Fees details in the 3TL Transport Portal.</li>
            <li style="margin-bottom: 6px;">After entering the data you will receive a mail to the registered ID.</li>
            <li style="margin-bottom: 6px;">BUS PASS can be obtained by showing the fees receipt or allocation mail at Transport Office (Only student , No Parents). Suitable dates will be informed in Whatsapp group.</li>
          </ol>
          
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; color: #b45309;">
            <p style="margin: 0 0 6px 0; font-weight: bold;">Important Notes:</p>
            <ol style="margin: 0; padding-left: 20px; font-size: 13.5px;">
              <li style="margin-bottom: 4px;">Your Seat will be <strong>CONFIRMED</strong> only after receiving the bus pass on or before 01.09.2026.</li>
              <li style="margin-bottom: 4px;">If Not Paid, your allotted seat stays <strong>CANCELLED</strong> and it will be allocated to the other registered commuter.</li>
              <li style="margin-bottom: 4px;">From 1st September 2026 <strong>NEW BUS PASS</strong> is mandatory for boarding all the college bus.</li>
            </ol>
          </div>
          
          <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 12px; margin: 20px 0; border-radius: 4px; color: #0369a1; font-size: 13.5px;">
            <p style="margin: 0 0 6px 0; font-weight: bold;">WhatsApp group link</p>
            <p style="margin: 8px 0 10px 0;">
              <a href="https://chat.whatsapp.com/GceII176FFT3ZW1KdFzgVS" target="_blank" style="display: inline-block; background-color: #25d366; color: #ffffff; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px;">Join WhatsApp Group</a>
            </p>
            <p style="margin: 4px 0;">✅ Only student with their own mobile number should join the iTech Bus 26-27 Group.</p>
            <p style="margin: 4px 0; color: #b91c1c; font-weight: bold;">❌ Parents Don't join in this group.</p>
          </div>
          
          <p style="margin-top: 20px;">Thank you</p>
          <p style="margin: 0; font-weight: bold;">With Regards,</p>
          <p style="margin: 0; font-weight: bold;">Team Transport</p>
        </div>
      `;
    }
  } else {
    // 3. Faculty / Staff
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; color: #374151; line-height: 1.6;">
        <h2 style="color: #1d4ed8; text-align: center; margin-bottom: 5px; font-size: 22px; font-weight: bold;">Transport Section PSG iTech</h2>
        <hr style="border: 0; border-top: 1px solid #d1d5db; margin-bottom: 20px;" />
        
        <p>Dear ${registration.name},</p>
        <p><strong>Greetings of the Day !</strong></p>
        <p>Transport section of PSGiTech is happy to <strong>ALLOCATE</strong> you a seat in college bus based on your chosen boardingpoint.</p>
        
        <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
            <tbody>
              <tr style="height: 30px;"><td style="font-weight: bold; width: 40%;">Bus Route:</td><td>${routeName}</td></tr>
              <tr style="height: 30px;"><td style="font-weight: bold;">Boarding Point:</td><td>${boardingPoint}</td></tr>
              <tr style="height: 30px;"><td style="font-weight: bold;">Duration:</td><td>From ${fromMonth} To ${toMonth}</td></tr>
              <tr style="height: 30px;"><td style="font-weight: bold;">Annual Bus Fee:</td><td>₹${totalFees.toLocaleString()}</td></tr>
              <tr style="height: 30px;"><td style="font-weight: bold;">Mode of Payment:</td><td>Deduction from salary / cash</td></tr>
            </tbody>
          </table>
        </div>
        
        <p style="font-size: 14px; font-weight: bold; line-height: 1.5; color: #1e3a8a; background-color: #eff6ff; padding: 12px; border-radius: 6px; border-left: 4px solid #2563eb; margin: 20px 0;">
          Kindly get your BUS PASS from the Transport Office (Located between indoor sports stadium and hostel)
        </p>

        <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 12px; margin: 20px 0; border-radius: 4px; color: #0369a1; font-size: 13.5px;">
          <p style="margin: 0 0 6px 0; font-weight: bold;">WhatsApp group link</p>
          <p style="margin: 8px 0 10px 0;">
            <a href="https://chat.whatsapp.com/GceII176FFT3ZW1KdFzgVS" target="_blank" style="display: inline-block; background-color: #25d366; color: #ffffff; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px;">Join WhatsApp Group</a>
          </p>
          <p style="margin: 4px 0;">✅ Only faculty with their own mobile number should join the iTech Bus 26-27 Group.</p>
        </div>
        
        <p style="font-size: 14px; margin-top: 20px;">Thank you</p>
        <p style="font-size: 14px; font-weight: bold; margin: 0;">With Regards</p>
        <p style="font-size: 14px; font-weight: bold; margin: 0;">Team Transport</p>
      </div>
    `;
  }
};

const buildCancellationPolicyBlock = `
  <div style="margin-top: 16px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
    <div style="display: grid; grid-template-columns: 1fr 1fr; background: #eef2ff; font-weight: 700; color: #1d4ed8;">
      <div style="padding: 10px; border-right: 1px solid #d1d5db;">PERIOD</div>
      <div style="padding: 10px;">REFUND</div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #e5e7eb;"><div style="padding: 10px;">0 – 3 Months</div><div style="padding: 10px; color: #059669; font-weight: 700;">75% refundable</div></div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #e5e7eb;"><div style="padding: 10px;">4 – 6 Months</div><div style="padding: 10px; color: #d97706; font-weight: 700;">50% refundable</div></div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #e5e7eb;"><div style="padding: 10px;">7 – 9 Months</div><div style="padding: 10px; color: #e11d48; font-weight: 700;">25% refundable</div></div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #e5e7eb;"><div style="padding: 10px;">10 – 12 Months</div><div style="padding: 10px; color: #475569; font-weight: 700;">Nil</div></div>
  </div>
`;

const buildAdvanceRefundMail = (registration, reason) => `
  <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <div style="background: #2f5ea8; color: #fff; padding: 16px; text-align: center; font-size: 28px; font-weight: 700;">
      PSG iTech - Transport Section
    </div>
    <div style="padding: 24px; color: #222; line-height: 1.6;">
      <p>Dear ${registration.name},</p>
      <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px; border-radius: 4px; margin: 16px 0; color: #7f1d1d;">
        <p style="margin: 0; font-weight: 600;">Subject: Deallocation of Transport Seat</p>
        <p style="margin: 8px 0 0 0;">Your transport registration has been deallocated.</p>
        <p style="margin: 8px 0 0 0;">Reason: ${reason || 'As per transport rules and admin action'}</p>
        <p style="margin: 8px 0 0 0;">Advance Paid: Yes | Final Fee Paid: No</p>
      </div>
      <p style="margin-top: 16px; font-weight: 600;">Refund Details:</p>
      <p style="margin: 8px 0;">Your advance payment of ₹5,000 will be refunded by <strong>October 7, 2026</strong>.</p>
      <p style="margin: 8px 0;">Please allow 5-7 business days for the refund to be processed into your account.</p>
      <p>With regards,</p>
      <p style="font-weight: 700;">Team Transport</p>
    </div>
    <div style="padding: 12px 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">Email: transport.psgitech@gmail.com</div>
  </div>
`;

const buildDeallocationMail = (registration, reason, options = {}) => `
  <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <div style="background: #2f5ea8; color: #fff; padding: 16px; text-align: center; font-size: 28px; font-weight: 700;">
      PSG iTech - Transport Section
    </div>
    <div style="padding: 24px; color: #222; line-height: 1.6;">
      <p>Dear ${registration.name},</p>
      <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px; border-radius: 4px; margin: 16px 0; color: #7f1d1d;">
        <p style="margin: 0; font-weight: 600;">Subject: Deallocation of Transport Seat</p>
        <p style="margin: 8px 0 0 0;">Your transport registration has been deallocated.</p>
        <p style="margin: 8px 0 0 0;">Reason: ${reason || 'As per transport rules and admin action'}</p>
        <p style="margin: 8px 0 0 0;">Advance Paid: ${registration.advancePaid ? 'Yes' : 'No'} | Final Fee Paid: ${registration.fullFeePaid ? 'Yes' : 'No'}</p>
      </div>
      ${options.includeCancellationPolicy ? `<p style="margin-top: 16px;"><strong>Cancellation Policy (Applicable for paid cancellation cases):</strong></p>${buildCancellationPolicyBlock}` : ''}
      <p>With regards,</p>
      <p style="font-weight: 700;">Team Transport</p>
    </div>
    <div style="padding: 12px 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">Email: transport.psgitech@gmail.com</div>
  </div>
`;

const buildCancellationMail = (registration, reason, options = {}) => {
  const refundAmount = (registration.advancePaid && !registration.fullFeePaid) ? '₹5,000' : 'N/A';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background: #dc2626; color: #fff; padding: 16px; text-align: center; font-size: 26px; font-weight: 700;">
        PSG iTech - Transport Section
      </div>
      <div style="padding: 24px; color: #222; line-height: 1.6;">
        <p>Dear ${registration.name},</p>
        <p style="font-size: 15px; color: #374151;">Greetings of the Day !</p>
        <p style="font-size: 15px; color: #374151; line-height: 1.5;">We would like to inform you that your request for transport registration cancellation has been successfully <strong>APPROVED</strong>.</p>
        
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 14px; border-radius: 4px; margin: 16px 0; color: #7f1d1d;">
          <p style="margin: 0; font-weight: 600;">Subject: Transport Registration Cancelled</p>
          <p style="margin: 8px 0 0 0;">Status: <strong>Cancelled</strong></p>
          <p style="margin: 8px 0 0 0;">Reason for Cancellation: ${reason || 'As requested by user'}</p>
          <p style="margin: 8px 0 0 0;">Boarding Point: ${registration.boardingPoint || 'N/A'}</p>
        </div>

        ${registration.advancePaid ? `
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #374151;">Refund Information:</p>
            <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.4;">
              Your advance payment of <strong>₹5,000</strong> will be refunded fully on or before <strong>September 10, 2026</strong>.
            </p>
          </div>
        ` : ''}

        <p style="margin-top: 20px;">Thank you</p>
        <p style="font-weight: 700; margin: 0;">With Regards,</p>
        <p style="font-weight: 700; margin: 0;">Team Transport</p>
      </div>
      <div style="padding: 12px 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">Email: transport.psgitech@gmail.com</div>
    </div>
  `;
};

const buildUnpaidDeallocationMail = (registration) => `
  <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <div style="background: #dc2626; color: #fff; padding: 16px; text-align: center; font-size: 24px; font-weight: 700;">
      PSG iTech - Transport Section
    </div>
    <div style="padding: 24px; color: #222; line-height: 1.6;">
      <p>Dear ${registration.name},</p>
      <p>Greetings of the Day !</p>
      <p>This is to inform you that your allocated transport seat has been <strong>CANCELLED / DEALLOCATED</strong> because the pending fee payment was not completed within the given deadline date.</p>
      
      <div style="background: #fffbeb; border-left: 4px solid #d97706; padding: 14px; border-radius: 4px; margin: 16px 0; color: #92400e;">
        <p style="margin: 0; font-weight: 600;">Status: Deallocated (Payment Overdue)</p>
        <p style="margin: 8px 0 0 0;">Reason: Annual transport fee payment not completed within the given date.</p>
        <p style="margin: 8px 0 0 0;">Boarding Point: ${registration.boardingPoint || 'N/A'}</p>
      </div>

      <p><strong>Refund Details:</strong></p>
      <p>Since the payment deadline has passed, your advance payment of <strong>₹5,000</strong> will be refunded fully on or before <strong>September 10, 2026</strong>.</p>
      <p>Please contact the Transport Office for your refund details and process.</p>
      
      <p>Thank you</p>
      <p style="font-weight: 700; margin: 0;">With Regards,</p>
      <p style="font-weight: 700; margin: 0;">Team Transport</p>
    </div>
    <div style="padding: 12px 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">Email: transport.psgitech@gmail.com</div>
  </div>
`;

// ============ ALLOCATION ENGINE ============

// Allocate seats - route-wise or whole
router.post('/allocate', async (req, res) => {
  try {
    const { mode, routeId } = req.body; // mode: 'route' or 'all'

    if (mode === 'route' && !routeId) {
      return res.status(400).json({ message: 'Route ID required for route-wise allocation' });
    }

    let routes;
    if (mode === 'route') {
      routes = [await Route.findById(routeId)];
    } else {
      routes = await Route.find({ isActive: true });
    }

    const allocationResults = [];

    for (const route of routes) {
      const stopNames = route.stops.map(s => s.name);
      const capacity = route.capacity;

      // Get pending registrations for this route
      const pendingRegs = await Registration.find({
        boardingPointRoute: route._id,
        registrationStatus: 'pending',
        isBlocked: { $ne: true },
        cancellationRequested: { $ne: true }
      });

      // Separate by type and filter eligibility:
      // - Faculty / Staff: no advance check
      // - Reservation (Government Sponsored): exempt from advance check
      // - Regular Student: must have paid advance
      const faculty = pendingRegs.filter(r => r.userType === 'faculty');
      const staff = pendingRegs.filter(r => r.userType === 'staff');
      const seniorStudents = pendingRegs.filter(r => r.userType === 'student' && r.academicYear >= 2 && (r.advancePaid || r.governmentSponsored));
      const firstYearStudents = pendingRegs.filter(r => r.userType === 'student' && r.academicYear === 1 && (r.advancePaid || r.governmentSponsored));

      // Sort faculty: age DESC (oldest first), then distanceOrder ASC (farthest first = lower number)
      faculty.sort((a, b) => (b.age || 0) - (a.age || 0) || (a.distanceOrder || 99) - (b.distanceOrder || 99));

      // Sort staff: age DESC, then distanceOrder ASC
      staff.sort((a, b) => (b.age || 0) - (a.age || 0) || (a.distanceOrder || 99) - (b.distanceOrder || 99));

      // Sort students: distanceOrder ASC (farthest first)
      seniorStudents.sort((a, b) => (a.distanceOrder || 99) - (b.distanceOrder || 99));
      firstYearStudents.sort((a, b) => (a.distanceOrder || 99) - (b.distanceOrder || 99));

      // Already allocated count
      const alreadyAllocated = await Registration.countDocuments({
        boardingPointRoute: route._id,
        registrationStatus: 'allocated'
      });

      let remainingSeats = capacity - alreadyAllocated;
      let allocated = { faculty: 0, staff: 0, seniorStudents: 0, firstYear: 0 };
      const newlyAllocatedRegs = [];

      // Allocate faculty
      for (const f of faculty) {
        if (remainingSeats <= 0) break;
        f.registrationStatus = 'allocated';
        f.allocatedRoute = route._id;
        f.allocatedStop = f.boardingPoint;
        await f.save();
        newlyAllocatedRegs.push(f);
        remainingSeats--;
        allocated.faculty++;
      }

      // Allocate staff
      for (const s of staff) {
        if (remainingSeats <= 0) break;
        s.registrationStatus = 'allocated';
        s.allocatedRoute = route._id;
        s.allocatedStop = s.boardingPoint;
        await s.save();
        newlyAllocatedRegs.push(s);
        remainingSeats--;
        allocated.staff++;
      }

      // Allocate senior students (2nd-5th year)
      for (const st of seniorStudents) {
        if (remainingSeats <= 0) break;
        st.registrationStatus = 'allocated';
        st.allocatedRoute = route._id;
        st.allocatedStop = st.boardingPoint;
        await st.save();
        newlyAllocatedRegs.push(st);
        remainingSeats--;
        allocated.seniorStudents++;
      }

      // Allocate 1st year students (Phase 2)
      for (const st of firstYearStudents) {
        if (remainingSeats <= 0) break;
        st.registrationStatus = 'allocated';
        st.allocatedRoute = route._id;
        st.allocatedStop = st.boardingPoint;
        await st.save();
        newlyAllocatedRegs.push(st);
        remainingSeats--;
        allocated.firstYear++;
      }

      // Send emails to all newly allocated users
      for (const reg of newlyAllocatedRegs) {
        if (reg.mailId) {
          const subject = reg.userType === 'faculty' || reg.userType === 'staff'
            ? 'Bus Seat Allocated - Faculty / Staff'
            : (reg.governmentSponsored ? 'Bus Seat Allocated - Sponsored / Scholarship' : 'Bus Seat Allocated');
          sendMail(reg.mailId, subject, buildAllocationMail(reg, route));
        }
      }

      const totalNewlyAllocated = allocated.faculty + allocated.staff + allocated.seniorStudents + allocated.firstYear;
      const notAllocated = pendingRegs.length - totalNewlyAllocated;

      allocationResults.push({
        route: route.routeNumber,
        routeName: route.routeName,
        capacity,
        previouslyAllocated: alreadyAllocated,
        newlyAllocated: allocated,
        notAllocated,
        remainingSeats
      });
    }

    res.json({
      message: 'Allocation completed',
      mode,
      results: allocationResults
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ CANCELLATIONS & DEALLOCATION ============

// Get all cancellation requests
router.get('/cancellations', async (req, res) => {
  try {
    const requests = await Registration.find({ cancellationRequested: true, registrationStatus: { $ne: 'cancelled' } });
    res.json(requests);
  } catch(err) { res.status(500).json({message: err.message}) }
});

// Approve cancellation
router.post('/approve-cancellation/:id', async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    registration.registrationStatus = 'cancelled';
    registration.allocatedRoute = null;
    registration.allocatedStop = null;
    registration.cancellationRequested = false;
    await registration.save();

    if (registration.mailId) {
      const reason = registration.cancellationReason || 'Cancellation request approved';
      const includeCancellationPolicy = Boolean(registration.advancePaid || registration.fullFeePaid);
      const emailContent = buildCancellationMail(registration, reason, { includeCancellationPolicy });
      
      await sendMail(
        registration.mailId,
        'Cancellation of Transport Seat',
        emailContent
      );
    }

    res.json({ message: 'Cancellation approved' });
  } catch(err) { res.status(500).json({message: err.message}) }
});

// Mark a user as waitlisted manually
router.post('/waitlist/:registrationId', async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.registrationId);
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (!registration.advancePaid) return res.status(400).json({ message: 'Only advance-paid users can be moved to waiting list' });

    registration.registrationStatus = 'waitlisted';
    await registration.save();
    res.json({ message: 'User moved to waiting list', registration });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Manual deallocation with reason
router.post('/deallocate/:registrationId', async (req, res) => {
  try {
    const { reason } = req.body;
    const registration = await Registration.findById(req.params.registrationId);
    if (!registration) return res.status(404).json({ message: 'Registration not found' });

    registration.registrationStatus = 'deallocated';
    registration.allocatedRoute = null;
    registration.allocatedStop = null;
    registration.deallocationReason = reason || 'Deallocated by admin';
    registration.deallocatedAt = new Date();
    await registration.save();

    if (registration.mailId) {
      if (registration.advancePaid) {
        await sendMail(
          registration.mailId,
          'Deallocation of Transport Seat - Payment Overdue',
          buildUnpaidDeallocationMail(registration)
        );
      } else {
        await sendMail(
          registration.mailId,
          'Deallocation of Transport Seat',
          buildDeallocationMail(registration, registration.deallocationReason)
        );
      }
    }

    res.json({ message: 'User deallocated successfully', registration });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Resend mails if required
router.post('/resend-mail/:registrationId', async (req, res) => {
  try {
    const { type, fromMonth, toMonth, deadline, venue, modeOfPayment } = req.body;
    const registration = await Registration.findById(req.params.registrationId)
      .populate('boardingPointRoute', 'routeNumber routeName')
      .populate('allocatedRoute', 'routeNumber routeName');
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (!registration.mailId) return res.status(400).json({ message: 'User does not have an email ID' });

    if (type === 'registration') {
      await sendMail(registration.mailId, 'Transport Registration Confirmation - AY 2026-27', buildRegistrationMail(registration));
    } else if (type === 'allocation') {
      if (registration.registrationStatus !== 'allocated') {
        const routeId = registration.allocatedRoute || registration.boardingPointRoute;
        if (!routeId) return res.status(400).json({ message: 'No route found for allocation mail' });
        
        registration.allocatedRoute = routeId;
        registration.allocatedStop = registration.allocatedStop || registration.boardingPoint;
        registration.registrationStatus = 'allocated';
        await registration.save();
      }
      
      const route = await Route.findById(registration.allocatedRoute);
      if (!route) return res.status(400).json({ message: 'No route found for allocation mail' });
      
      const subject = registration.userType === 'faculty' || registration.userType === 'staff'
        ? 'Bus Seat Allocated - Faculty / Staff'
        : (registration.governmentSponsored ? 'Bus Seat Allocated - Sponsored / Scholarship' : 'Bus Seat Allocated');
      await sendMail(registration.mailId, subject, buildAllocationMail(registration, route, { fromMonth, toMonth, deadline, venue, modeOfPayment }));
    } else if (type === 'unpaid') {
      await sendMail(
        registration.mailId,
        'Deallocation of Transport Seat - Payment Overdue',
        buildUnpaidDeallocationMail(registration)
      );
    } else if (type === 'deallocation' || type === 'cancellation') {
      const includeCancellationPolicy = registration.registrationStatus === 'cancelled' && Boolean(registration.advancePaid || registration.fullFeePaid);
      if (registration.registrationStatus === 'cancelled' || type === 'cancellation') {
        const reason = registration.deallocationReason || registration.cancellationReason || 'Cancellation approved';
        await sendMail(
          registration.mailId,
          'Cancellation of Transport Seat',
          buildCancellationMail(registration, reason, { includeCancellationPolicy })
        );
      } else {
        await sendMail(
          registration.mailId,
          'Deallocation of Transport Seat',
          buildDeallocationMail(registration, registration.deallocationReason, { includeCancellationPolicy })
        );
      }
    } else if (type === 'unallocated') {
      await sendMail(registration.mailId, 'Transport Registration Status Update', buildUnallocatedMail(registration));
    } else if (type === 'paid') {
      await sendMail(registration.mailId, 'Transport Fee Payment Confirmed', buildPaidMail(registration));
    } else {
      return res.status(400).json({ message: 'Invalid mail type' });
    }

    res.json({ message: 'Mail sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk send allocation emails
router.post('/send-bulk-emails', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const {
      userType, // 'all', 'student', 'faculty', 'staff'
      routeId,  // optional: specific route
      commuterId, // optional: roll number, employee ID, email, or registration ID
      fromMonth,
      toMonth,
      deadline,
      venue,
      modeOfPayment
    } = req.body;

    let query = {};
    
    if (commuterId && commuterId.trim()) {
      const idVal = commuterId.trim();
      const lookupConditions = [
        { registerNumber: idVal },
        { employeeId: idVal },
        { mailId: idVal }
      ];
      if (mongoose.Types.ObjectId.isValid(idVal)) {
        lookupConditions.push({ _id: idVal });
      }
      query = {
        $or: lookupConditions
      };
    } else {
      query.registrationStatus = 'allocated';
      if (userType && userType !== 'all') {
        if (userType === 'reservation') {
          query.userType = 'student';
          query.governmentSponsored = true;
        } else if (userType === 'student') {
          query.userType = 'student';
          query.governmentSponsored = false;
        } else if (userType === 'faculty_staff') {
          query.userType = { $in: ['faculty', 'staff'] };
        } else {
          query.userType = userType;
        }
      }
      if (routeId) {
        query.allocatedRoute = routeId;
      }
    }

    const registrations = await Registration.find(query);

    if (registrations.length === 0) {
      return res.status(404).json({ message: commuterId ? 'No commuter found matching that ID.' : 'No allocated commuters found matching the criteria.' });
    }

    let sentCount = 0;
    for (const reg of registrations) {
      if (reg.registrationStatus !== 'allocated') {
        const rId = reg.allocatedRoute || reg.boardingPointRoute;
        if (!rId) continue;
        reg.allocatedRoute = rId;
        reg.allocatedStop = reg.allocatedStop || reg.boardingPoint;
        reg.registrationStatus = 'allocated';
        await reg.save();
      }

      const route = await Route.findById(reg.allocatedRoute);
      if (!route) continue;

      if (reg.mailId) {
        const emailContent = buildAllocationMail(reg, route, {
          fromMonth,
          toMonth,
          deadline,
          venue,
          modeOfPayment
        });
        const subject = reg.userType === 'faculty' || reg.userType === 'staff'
          ? 'Bus Seat Allocated - Faculty / Staff'
          : (reg.governmentSponsored ? 'Bus Seat Allocated - Sponsored / Scholarship' : 'Bus Seat Allocated');
        sendMail(reg.mailId, subject, emailContent);
        sentCount++;
      }
    }

    res.json({ message: `Successfully sent allocation emails to ${sentCount} user(s).` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Manual individual allocation
router.post('/allocate-individual/:registrationId', async (req, res) => {
  try {
    const { routeId, stopName } = req.body;
    const registration = await Registration.findById(req.params.registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    registration.registrationStatus = 'allocated';
    registration.allocatedRoute = routeId;
    registration.allocatedStop = stopName || registration.boardingPoint;
    await registration.save();

    if (registration.mailId) {
      const subject = registration.userType === 'faculty' || registration.userType === 'staff'
        ? 'Bus Seat Allocated - Faculty / Staff'
        : (registration.governmentSponsored ? 'Bus Seat Allocated - Sponsored / Scholarship' : 'Bus Seat Allocated');
      sendMail(registration.mailId, subject, buildAllocationMail(registration, route));
    }

    res.json({ message: `Successfully allocated ${registration.name} to Route ${route.routeNumber}`, registration });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update commuter details (not status or payment)
router.put('/registration/:registrationId', async (req, res) => {
  try {
    const { name, mailId, registerNumber, employeeId, userType, academicYear, boardingPoint } = req.body;
    const registration = await Registration.findById(req.params.registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    if (name !== undefined) registration.name = name;
    if (mailId !== undefined) registration.mailId = mailId;
    if (registerNumber !== undefined) registration.registerNumber = registerNumber;
    if (employeeId !== undefined) registration.employeeId = employeeId;
    if (userType !== undefined) registration.userType = userType;
    if (academicYear !== undefined) registration.academicYear = academicYear;
    if (boardingPoint !== undefined) registration.boardingPoint = boardingPoint;

    await registration.save();
    res.json({ message: 'Commuter details updated successfully', registration });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Deallocate unpaid (deallocate all allocated who have not paid advance)
router.post('/deallocate-unpaid', async (req, res) => {
  try {
    const result = await Registration.updateMany(
      { registrationStatus: 'allocated', advancePaid: { $ne: true } },
      { $set: { registrationStatus: 'pending', allocatedRoute: null, allocatedStop: null } }
    );
    res.json({ message: `Deallocated ${result.modifiedCount} users who had not paid advance.` });
  } catch(err) { res.status(500).json({message: err.message}) }
});

// Deallocate/Reject unallocated but paid (Refund option)
router.post('/reject-unallocated', async (req, res) => {
  try {
    const result = await Registration.updateMany(
      { registrationStatus: 'pending', advancePaid: true },
      { $set: { registrationStatus: 'rejected_refund' } }
    );
    res.json({ message: `Rejected and marked ${result.modifiedCount} unallocated (but paid) users for refund.` });
  } catch(err) { res.status(500).json({message: err.message}) }
});

// ============ SWAP STOP ============

// Move a stop from one route to another
router.post('/swap-stop', async (req, res) => {
  try {
    const { stopName, fromRouteId, toRouteId } = req.body;

    const fromRoute = await Route.findById(fromRouteId);
    const toRoute = await Route.findById(toRouteId);

    if (!fromRoute || !toRoute) {
      return res.status(404).json({ message: 'Route not found' });
    }

    // Find the stop in the source route
    const stopIndex = fromRoute.stops.findIndex(s => s.name === stopName);
    if (stopIndex === -1) {
      return res.status(404).json({ message: 'Stop not found in source route' });
    }

    const stop = fromRoute.stops[stopIndex];

    // Move stop to target route
    toRoute.stops.push({
      name: stop.name,
      fees: stop.fees,
      time: stop.time,
      distanceOrder: toRoute.stops.length + 1
    });
    fromRoute.stops.splice(stopIndex, 1);

    await fromRoute.save();
    await toRoute.save();

    // Update all registrations with this boarding point
    await Registration.updateMany(
      { boardingPoint: stopName, boardingPointRoute: fromRouteId },
      {
        boardingPointRoute: toRouteId,
        allocatedRoute: null,
        allocatedStop: null,
        registrationStatus: 'pending'
      }
    );

    res.json({
      message: `Stop "${stopName}" moved from ${fromRoute.routeNumber} to ${toRoute.routeNumber}`,
      fromRoute: fromRoute.routeNumber,
      toRoute: toRoute.routeNumber
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ ALL REGISTRATIONS ============

// Admin: get all suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = await Suggestion.find().sort({ createdAt: -1 }).limit(5000)
    res.json(suggestions)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Admin: export suggestions as CSV
router.get('/suggestions/export', async (req, res) => {
  try {
    const suggestions = await Suggestion.find().sort({ createdAt: -1 }).limit(5000)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="suggestions.csv"')
    // CSV header
    res.write('registerNumber,employeeId,mailId,routeSuggestion,createdAt\n')
    for (const s of suggestions) {
      // Escape double quotes and commas
      const route = (s.routeSuggestion || '').replace(/"/g, '""')
      res.write(`"${s.registerNumber || ''}","${s.employeeId || ''}","${s.mailId}","${route}","${s.createdAt.toISOString()}"\n`)
    }
    res.end()
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/registrations', async (req, res) => {
  try {
    const { userType, status, route, boardingPoint, search, page = 1, limit = 50, advancePaid, fullFeePaid, view } = req.query;
    const query = {};
    if (userType) query.userType = userType;
    if (status) query.registrationStatus = status;
    if (route) query.boardingPointRoute = route;
    if (boardingPoint) query.boardingPoint = boardingPoint;
    if (advancePaid === 'true' || advancePaid === 'false') query.advancePaid = advancePaid === 'true';
    if (fullFeePaid === 'true' || fullFeePaid === 'false') query.fullFeePaid = fullFeePaid === 'true';

    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      const escapedSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { registerNumber: { $regex: escapedSearch, $options: 'i' } },
        { employeeId: { $regex: escapedSearch, $options: 'i' } },
        { mailId: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    if (view === 'registered') {
      query.registrationCompleted = true;
    } else if (view === 'unregistered') {
      const payments = await Payment.find({ paidStatus: 'confirmed' })
        .populate('registration', 'name userType registerNumber employeeId boardingPoint boardingPointRoute registrationStatus registrationCompleted advancePaid fullFeePaid')
        .sort({ confirmedAt: -1, updatedAt: -1, createdAt: -1 })
        .limit(Math.min(parseInt(limit, 10) || 50, 500));

      const registrations = payments
        .filter(payment => !payment.registration || payment.registration.registrationCompleted === false)
        .map(payment => ({
          _id: payment._id,
          name: payment.registration?.name || 'Unregistered advance payment',
          userType: payment.registration?.userType || 'student',
          registerNumber: payment.rollNumber,
          registrationStatus: 'unregistered',
          advancePaid: true,
          fullFeePaid: false,
          boardingPoint: payment.registration?.boardingPoint || '',
          boardingPointRoute: payment.registration?.boardingPointRoute || null,
          paymentDate: payment.paymentDate,
          receiptNumber: payment.receiptNumber,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt
        }));

      return res.json({ total: registrations.length, page: parseInt(page), limit: parseInt(limit), registrations });
    } else if (view === 'deallocated') {
      query.registrationStatus = { $in: ['rejected', 'cancelled', 'rejected_refund'] };
    } else if (view === 'allocated') {
      query.registrationStatus = 'allocated';
    } else if (view === 'need-allocation') {
      query.advancePaid = true;
      query.registrationStatus = { $in: ['pending', 'waitlisted'] };
      query.cancellationRequested = { $ne: true };
    }

    const total = await Registration.countDocuments(query);
    const registrations = await Registration.find(query)
      .populate('boardingPointRoute', 'routeNumber routeName')
      .populate('allocatedRoute', 'routeNumber routeName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ total, page: parseInt(page), limit: parseInt(limit), registrations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
