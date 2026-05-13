const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const Route = require('../models/Route');

// Get all boarding points grouped by route
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

// Register student
router.post('/student', async (req, res) => {
  try {
    const {
      registerNumber, name, gender, dateOfBirth, academicYear,
      department, institution, address, pincode, boardingPoint,
      phoneNumber, emergencyPhoneNumber, mailId,
      guidelinesAccepted, instructionsAccepted
    } = req.body;

    // Validate guidelines accepted
    if (!guidelinesAccepted || !instructionsAccepted) {
      return res.status(400).json({ message: 'You must accept both guidelines and instructions' });
    }

    // Check duplicate
    const existing = await Registration.findOne({ registerNumber, userType: 'student' });
    if (existing) {
      return res.status(400).json({ message: 'Student with this register number already registered' });
    }

    // Find route and stop info
    const route = await Route.findOne({ 'stops.name': boardingPoint });
    if (!route) {
      return res.status(400).json({ message: 'Invalid boarding point' });
    }
    const stop = route.stops.find(s => s.name === boardingPoint);

    const registration = new Registration({
      userType: 'student',
      registerNumber, name, gender, dateOfBirth: new Date(dateOfBirth),
      academicYear: parseInt(academicYear), department, institution,
      address, pincode, boardingPoint,
      boardingPointRoute: route._id,
      boardingPointFees: stop.fees,
      distanceOrder: stop.distanceOrder,
      phoneNumber, emergencyPhoneNumber, mailId,
      guidelinesAccepted, instructionsAccepted
    });

    await registration.save();
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

// Register faculty
router.post('/faculty', async (req, res) => {
  try {
    const {
      employeeId, name, dateOfBirth, category, designation,
      department, institution, address, pincode, boardingPoint,
      phoneNumber, emergencyPhoneNumber, mailId,
      guidelinesAccepted, instructionsAccepted
    } = req.body;

    if (!guidelinesAccepted || !instructionsAccepted) {
      return res.status(400).json({ message: 'You must accept both guidelines and instructions' });
    }

    const existing = await Registration.findOne({ employeeId, userType: 'faculty' });
    if (existing) {
      return res.status(400).json({ message: 'Faculty with this employee ID already registered' });
    }

    const route = await Route.findOne({ 'stops.name': boardingPoint });
    if (!route) {
      return res.status(400).json({ message: 'Invalid boarding point' });
    }
    const stop = route.stops.find(s => s.name === boardingPoint);

    const registration = new Registration({
      userType: 'faculty',
      employeeId, name, dateOfBirth: new Date(dateOfBirth),
      category, designation, department, institution,
      address, pincode, boardingPoint,
      boardingPointRoute: route._id,
      boardingPointFees: stop.fees,
      distanceOrder: stop.distanceOrder,
      phoneNumber, emergencyPhoneNumber, mailId,
      guidelinesAccepted, instructionsAccepted
    });

    await registration.save();
    res.status(201).json({
      message: 'Faculty registration successful!',
      registrationId: registration._id,
      finalFees: registration.finalFees,
      concession: '50%'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Register staff
router.post('/staff', async (req, res) => {
  try {
    const {
      employeeId, name, dateOfBirth, category, designation,
      department, institution, address, pincode, boardingPoint,
      phoneNumber, emergencyPhoneNumber, mailId,
      guidelinesAccepted, instructionsAccepted
    } = req.body;

    if (!guidelinesAccepted || !instructionsAccepted) {
      return res.status(400).json({ message: 'You must accept both guidelines and instructions' });
    }

    const existing = await Registration.findOne({ employeeId, userType: 'staff' });
    if (existing) {
      return res.status(400).json({ message: 'Staff with this employee ID already registered' });
    }

    const route = await Route.findOne({ 'stops.name': boardingPoint });
    if (!route) {
      return res.status(400).json({ message: 'Invalid boarding point' });
    }
    const stop = route.stops.find(s => s.name === boardingPoint);

    const registration = new Registration({
      userType: 'staff',
      employeeId, name, dateOfBirth: new Date(dateOfBirth),
      category, designation, department, institution,
      address, pincode, boardingPoint,
      boardingPointRoute: route._id,
      boardingPointFees: stop.fees,
      distanceOrder: stop.distanceOrder,
      phoneNumber, emergencyPhoneNumber, mailId,
      guidelinesAccepted, instructionsAccepted
    });

    await registration.save();
    res.status(201).json({
      message: 'Staff registration successful!',
      registrationId: registration._id,
      finalFees: registration.finalFees,
      concession: '25%'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check registration status
router.get('/status/:id', async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id)
      .populate('boardingPointRoute', 'routeNumber routeName')
      .populate('allocatedRoute', 'routeNumber routeName');
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    res.json(registration);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lookup by register number or employee ID
router.get('/lookup', async (req, res) => {
  try {
    const { registerNumber, employeeId } = req.query;
    let query = {};
    if (registerNumber) query.registerNumber = registerNumber;
    if (employeeId) query.employeeId = employeeId;

    const registration = await Registration.findOne(query)
      .populate('boardingPointRoute', 'routeNumber routeName')
      .populate('allocatedRoute', 'routeNumber routeName');
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }
    res.json(registration);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
