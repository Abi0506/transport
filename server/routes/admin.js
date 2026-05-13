const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const Registration = require('../models/Registration');
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
      const totalRegistered = registrations.length;
      const allocatedCount = registrations.filter(r => r.registrationStatus === 'allocated').length;

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
        occupancyPercent: route.capacity > 0 ? Math.round((totalRegistered / route.capacity) * 100) : 0,
        facultyCount,
        staffCount,
        studentTotal,
        studentsByYear,
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
    await Registration.findByIdAndUpdate(req.params.id, { registrationStatus: 'cancelled' });
    res.json({ message: 'Cancellation approved' });
  } catch(err) { res.status(500).json({message: err.message}) }
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
    const { userType, status, route, page = 1, limit = 50 } = req.query;
    const query = {};
    if (userType) query.userType = userType;
    if (status) query.registrationStatus = status;
    if (route) query.boardingPointRoute = route;

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
