const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const Registration = require('../models/Registration');
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
    const pendingCount = await Registration.countDocuments({ registrationStatus: 'pending' });
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

      const facultyCount = registrations.filter(r => r.userType === 'faculty').length;
      const staffCount = registrations.filter(r => r.userType === 'staff').length;
      const studentsByYear = {};
      for (let y = 1; y <= 5; y++) {
        studentsByYear[`year${y}`] = registrations.filter(
          r => r.userType === 'student' && r.academicYear === y
        ).length;
      }
      const studentTotal = registrations.filter(r => r.userType === 'student').length;
      const studentsByYearPercent = {};
      for (let y = 1; y <= 5; y++) {
        const key = `year${y}`;
        studentsByYearPercent[key] = studentTotal > 0 ? Math.round((studentsByYear[key] / studentTotal) * 100) : 0;
      }
      const totalRegistered = registrations.length;
      const allocatedCount = registrations.filter(r => r.registrationStatus === 'allocated').length;
      const needAllocationCount = registrations.filter(r => r.advancePaid && ['pending', 'waitlisted'].includes(r.registrationStatus)).length;

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
        totalRegistered,
        allocatedCount,
        needAllocationCount,
        occupancyPercent: route.capacity > 0 ? Math.round((totalRegistered / route.capacity) * 100) : 0,
        facultyCount,
        staffCount,
        studentTotal,
        studentsByYear,
        studentsByYearPercent,
        facultyPercent: route.capacity > 0 ? Math.round((facultyCount / route.capacity) * 100) : 0,
        staffPercent: route.capacity > 0 ? Math.round((staffCount / route.capacity) * 100) : 0,
        studentPercent: route.capacity > 0 ? Math.round((studentTotal / route.capacity) * 100) : 0,
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
      <p><strong>Advance Payment:</strong> ₹5,000 must be paid in advance (cash at office). This amount is refundable as per transport rules.</p>
      <p>Allocation will be done based on your boarding point and the distance matrix.</p>
      <p>If you are allotted a seat, you will receive an allocation mail regarding bus fees, payment date, bus route number, and other procedures.</p>
      <p><strong>Important:</strong> Please refer to the Transport Guidelines for detailed information.</p>
      <p>You can share your suggestions in: <a href="http://localhost:7078app/suggestion">http://localhost:7078app/suggestion</a></p>
      <p>Thank you<br />With Regards<br />Team Transport</p>
    </div>
  </div>
`;

const buildAllocationMail = (registration, route) => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Seat Allocated</h2>
    <p>Dear ${registration.name},</p>
    <p>Congratulations! A seat has been successfully allocated to you on Route ${route.routeNumber} (${route.routeName}).</p>
    <p>Boarding Point: ${registration.boardingPoint}</p>
    <p>Final Fee: ₹${Math.round(registration.finalFees || 0).toLocaleString()}</p>
    <p>Team Transport</p>
  </div>
`;

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
      const facultyCap = Math.floor(capacity * 0.09);
      const staffCap = Math.floor(capacity * 0.06);
      const studentCap = capacity - facultyCap - staffCap;

      // Get pending registrations for this route that have PAID
      const pendingRegs = await Registration.find({
        boardingPointRoute: route._id,
        registrationStatus: 'pending',
        isBlocked: { $ne: true },
        advancePaid: true
      });

      // Separate by type
      const faculty = pendingRegs.filter(r => r.userType === 'faculty');
      const staff = pendingRegs.filter(r => r.userType === 'staff');
      const seniorStudents = pendingRegs.filter(r => r.userType === 'student' && r.academicYear >= 2);
      const firstYearStudents = pendingRegs.filter(r => r.userType === 'student' && r.academicYear === 1);

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
      const newlyAllocatedEmails = [];

      // Allocate faculty (up to 9% cap)
      const existingFaculty = await Registration.countDocuments({
        boardingPointRoute: route._id,
        registrationStatus: 'allocated',
        userType: 'faculty'
      });
      let facultySlots = Math.min(facultyCap - existingFaculty, remainingSeats);
      for (const f of faculty) {
        if (facultySlots <= 0 || remainingSeats <= 0) break;
        f.registrationStatus = 'allocated';
        f.allocatedRoute = route._id;
        f.allocatedStop = f.boardingPoint;
        await f.save();
        newlyAllocatedEmails.push(f.mailId);
        facultySlots--;
        remainingSeats--;
        allocated.faculty++;
      }

      // Allocate staff (up to 6% cap)
      const existingStaff = await Registration.countDocuments({
        boardingPointRoute: route._id,
        registrationStatus: 'allocated',
        userType: 'staff'
      });
      let staffSlots = Math.min(staffCap - existingStaff, remainingSeats);
      for (const s of staff) {
        if (staffSlots <= 0 || remainingSeats <= 0) break;
        s.registrationStatus = 'allocated';
        s.allocatedRoute = route._id;
        s.allocatedStop = s.boardingPoint;
        await s.save();
        newlyAllocatedEmails.push(s.mailId);
        staffSlots--;
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
        newlyAllocatedEmails.push(st.mailId);
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
        newlyAllocatedEmails.push(st.mailId);
        remainingSeats--;
        allocated.firstYear++;
      }

      // Send emails to all newly allocated users
      for (const email of newlyAllocatedEmails) {
        if (email) {
          sendMail(email, 'Bus Seat Allocated', `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Seat Allocated</h2>
              <p>Congratulations! A seat has been successfully allocated to you on Route ${route.routeNumber} (${route.routeName}).</p>
            </div>
          `);
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
      let emailContent;
      const reason = registration.cancellationReason || 'Cancellation request approved';
      
      // Choose email template based on payment status
      if (registration.advancePaid && !registration.fullFeePaid) {
        // Advance only - send advance refund email
        emailContent = buildAdvanceRefundMail(registration, reason);
      } else if (registration.fullFeePaid) {
        // Full payment - send deallocation with cancellation policy
        emailContent = buildDeallocationMail(registration, reason, { includeCancellationPolicy: true });
      } else {
        // No payment - send basic deallocation
        emailContent = buildDeallocationMail(registration, reason, { includeCancellationPolicy: false });
      }
      
      await sendMail(
        registration.mailId,
        'Deallocation of Transport Seat',
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

    registration.registrationStatus = 'rejected';
    registration.allocatedRoute = null;
    registration.allocatedStop = null;
    registration.deallocationReason = reason || 'Deallocated by admin';
    registration.deallocatedAt = new Date();
    await registration.save();

    if (registration.mailId) {
      await sendMail(registration.mailId, 'Deallocation of Transport Seat', buildDeallocationMail(registration, registration.deallocationReason));
    }

    res.json({ message: 'User deallocated successfully', registration });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Resend mails if required
router.post('/resend-mail/:registrationId', async (req, res) => {
  try {
    const { type } = req.body;
    const registration = await Registration.findById(req.params.registrationId)
      .populate('boardingPointRoute', 'routeNumber routeName')
      .populate('allocatedRoute', 'routeNumber routeName');
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (!registration.mailId) return res.status(400).json({ message: 'User does not have an email ID' });

    if (type === 'registration') {
      await sendMail(registration.mailId, 'Transport Registration Confirmation - AY 2026-27', buildRegistrationMail(registration));
    } else if (type === 'allocation') {
      const route = registration.allocatedRoute || registration.boardingPointRoute;
      if (!route) return res.status(400).json({ message: 'No route found for allocation mail' });
      await sendMail(registration.mailId, 'Bus Seat Allocated', buildAllocationMail(registration, route));
    } else if (type === 'deallocation') {
      const includeCancellationPolicy = registration.registrationStatus === 'cancelled' && Boolean(registration.advancePaid || registration.fullFeePaid);
      await sendMail(registration.mailId, 'Deallocation of Transport Seat', buildDeallocationMail(registration, registration.deallocationReason, { includeCancellationPolicy }));
    } else {
      return res.status(400).json({ message: 'Invalid mail type' });
    }

    res.json({ message: 'Mail sent successfully' });
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

router.get('/registrations', async (req, res) => {
  try {
    const { userType, status, route, page = 1, limit = 50, advancePaid, fullFeePaid, view } = req.query;
    const query = {};
    if (userType) query.userType = userType;
    if (status) query.registrationStatus = status;
    if (route) query.boardingPointRoute = route;
    if (advancePaid === 'true' || advancePaid === 'false') query.advancePaid = advancePaid === 'true';
    if (fullFeePaid === 'true' || fullFeePaid === 'false') query.fullFeePaid = fullFeePaid === 'true';

    if (view === 'registered') {
      query.registrationStatus = { $in: ['pending', 'allocated', 'waitlisted'] };
    } else if (view === 'deallocated') {
      query.registrationStatus = { $in: ['rejected', 'cancelled', 'rejected_refund'] };
    } else if (view === 'allocated') {
      query.registrationStatus = 'allocated';
    } else if (view === 'need-allocation') {
      query.advancePaid = true;
      query.registrationStatus = { $in: ['pending', 'waitlisted'] };
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
