const express = require('express');
const { sendMail } = require('../utils/mailer');
const router = express.Router();

// Temporary in-memory store for OTPs (in production, use Redis or MongoDB)
const otpStore = new Map();

router.post('/send', async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPurpose = purpose === 'cancellation' ? 'cancellation' : 'registration';

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(normalizedEmail, { otp, expires: Date.now() + 10 * 60 * 1000 }); // 10 minutes expiry

    await sendMail(normalizedEmail, `Your Transport ${normalizedPurpose === 'cancellation' ? 'Cancellation' : 'Registration'} OTP`, `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Transport ${normalizedPurpose === 'cancellation' ? 'Cancellation' : 'Registration'} Verification</h2>
        <p>Your OTP for ${normalizedPurpose} is:</p>
        <h1 style="color: #3b82f6; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `);

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

router.post('/verify', (req, res) => {
  const { email, otp } = req.body;
  
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedOtp = (otp || '').toString().trim();
  const stored = otpStore.get(normalizedEmail);

  if (!stored) {
    return res.status(400).json({ message: 'OTP not found or expired' });
  }

  if (Date.now() > stored.expires) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({ message: 'OTP expired' });
  }

  if (stored.otp !== normalizedOtp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  // OTP is valid
  otpStore.delete(normalizedEmail);
  res.json({ message: 'OTP verified successfully' });
});

module.exports = router;
