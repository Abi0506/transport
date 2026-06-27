const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Registration = require('../models/Registration');
const Route = require('../models/Route');
const router = express.Router();

// Admin login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (
    username === 'admin' &&
    password === 'transport@123'
  ) {
    const token = jwt.sign(
      { username, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    return res.json({ token, username });
  }
  res.status(401).json({ message: 'Invalid credentials' });
});

// User login
router.post('/user-login', async (req, res) => {
  try {
    const { id, dob } = req.body;
    const rawId = (id || '').toString().trim();
    // Build a case-insensitive exact-match regex for employeeId to allow I/i/A/a prefixes
    const esc = rawId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const empRegex = new RegExp('^' + esc + '$', 'i');

    // Find user by registerNumber (exact) or employeeId (case-insensitive)
    const user = await Registration.findOne({
      $or: [{ registerNumber: rawId }, { employeeId: empRegex }]
    })
      .populate('boardingPointRoute')
      .populate('allocatedRoute');

    if (!user) {
      return res.status(401).json({ message: 'Invalid ID or DOB' });
    }

    // Check DOB
    const userDobStr = user.dateOfBirth.toISOString().split('T')[0];
    if (userDobStr !== dob) {
      return res.status(401).json({ message: 'Invalid ID or DOB' });
    }

    const userData = user.toObject();
    delete userData.loginPasswordHash;
    delete userData.__v;
    res.json({ user: userData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// User login with admin-issued credentials
router.post('/credential-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await Registration.findOne({ loginUsername: username.trim() });
    if (!user || !user.loginPasswordHash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.loginPasswordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userData = user.toObject();
    delete userData.loginPasswordHash;
    delete userData.__v;
    res.json({ user: userData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Office staff login (using static credentials)
router.post('/office-login', async (req, res) => {
  try {
    const { officeId, password } = req.body;

    if (!officeId || !password) {
      return res.status(400).json({ message: 'Office ID and password are required' });
    }

    // Static office credentials
    if (officeId.trim() === 'office1' && password === 'office@123') {
      return res.json({ 
        message: 'Office login successful',
        isOfficeStaff: true,
        officeId: 'office1'
      });
    }

    return res.status(401).json({ message: 'Invalid office credentials' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Get current user details
router.get('/me', async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Registration.findById(decoded.userId)
      .populate('boardingPointRoute')
      .populate('allocatedRoute');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Get all active routes with their bus stops (public endpoint)
router.get('/routes', async (req, res) => {
  try {
    const routes = await Route.find({ isActive: true }).sort({ routeName: 1 });
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
