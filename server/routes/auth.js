const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Registration = require('../models/Registration');
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
    
    // Find user by registerNumber or employeeId
    const user = await Registration.findOne({
      $or: [{ registerNumber: id }, { employeeId: id }]
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

module.exports = router;
