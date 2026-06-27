const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const Payment = require('../models/Payment');
const Registration = require('../models/Registration');

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    // Use roll number as filename
    const rollNumber = req.body.rollNumber || 'unknown';
    cb(null, `${rollNumber}.pdf`);
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
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Upload receipt
router.post('/upload-receipt', upload.single('receipt'), async (req, res) => {
  try {
    const { rollNumber, receiptNumber, registrationId } = req.body;
    const normalizedRollNumber = (rollNumber || '').trim();
    const normalizedReceiptNumber = (receiptNumber || '').trim();

    if (!req.file) {
      return res.status(400).json({ message: 'PDF receipt file is required' });
    }

    if (!normalizedRollNumber || !normalizedReceiptNumber) {
      return res.status(400).json({ message: 'Roll number and receipt number are required' });
    }

    const uploadedFileName = path.parse(req.file.originalname).name.trim();
    if (uploadedFileName !== normalizedRollNumber) {
      return res.status(400).json({ message: 'PDF filename must match the roll number or staff ID' });
    }

    const existingReceipt = await Payment.findOne({ receiptNumber: normalizedReceiptNumber });
    if (existingReceipt && existingReceipt.rollNumber !== normalizedRollNumber) {
      return res.status(400).json({ message: 'This receipt number is already recorded for another user' });
    }

    // Find or create payment record
    let payment = await Payment.findOne({ rollNumber: normalizedRollNumber });
    if (payment) {
      if (payment.receiptNumber && payment.receiptNumber !== normalizedReceiptNumber) {
        return res.status(400).json({ message: 'A different receipt number is already recorded for this roll number' });
      }
      payment.receiptNumber = normalizedReceiptNumber;
      payment.receiptFile = req.file.path;
      payment.paidStatus = 'uploaded';
      payment.confirmationMethod = 'upload';
    } else {
      payment = new Payment({
        registration: registrationId,
        rollNumber: normalizedRollNumber,
        receiptNumber: normalizedReceiptNumber,
        receiptFile: req.file.path,
        paidStatus: 'uploaded',
        confirmationMethod: 'upload'
      });
    }
    await payment.save();

    // Update registration
    if (registrationId) {
      await Registration.findByIdAndUpdate(registrationId, {
        advancePaid: false, // Not confirmed yet, just uploaded
        receiptFile: req.file.path,
        advanceReceiptNumber: normalizedReceiptNumber,
        advanceConfirmationMethod: 'upload'
      });
    }

    res.json({ message: 'Receipt uploaded successfully', paymentId: payment._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Validate advance receipt before moving to OTP verification
router.get('/validate-advance', async (req, res) => {
  try {
    const { rollNumber, receiptNumber } = req.query;
    const normalizedRollNumber = (rollNumber || '').trim();
    const normalizedReceiptNumber = (receiptNumber || '').trim();

    if (!normalizedRollNumber || !normalizedReceiptNumber) {
      return res.status(400).json({ message: 'Roll number and receipt number are required' });
    }

    const payment = await Payment.findOne({
      rollNumber: normalizedRollNumber,
      receiptNumber: normalizedReceiptNumber,
      paidStatus: 'confirmed'
    }).populate('registration', 'name registerNumber employeeId userType');

    if (!payment) {
      return res.status(404).json({ message: 'Receipt number does not match the office payment record for this register number' });
    }

    res.json({
      valid: true,
      message: 'Receipt number verified successfully',
      payment: {
        rollNumber: payment.rollNumber,
        receiptNumber: payment.receiptNumber,
        paidStatus: payment.paidStatus,
        paymentDate: payment.paymentDate,
        confirmationMethod: payment.confirmationMethod
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit cancellation request
router.post('/cancel-request', async (req, res) => {
  try {
    const { registrationId, reason } = req.body;
    if (!registrationId) return res.status(400).json({ message: 'Registration ID required' });
    if (!reason || !reason.trim()) return res.status(400).json({ message: 'Cancellation reason is required' });
    
    await Registration.findByIdAndUpdate(registrationId, {
      cancellationRequested: true,
      cancellationReason: reason.trim(),
      cancellationLetter: null
    });
    
    res.json({ message: 'Cancellation request submitted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload final receipt
router.post('/upload-final-receipt', upload.single('receipt'), async (req, res) => {
  try {
    const { rollNumber, registrationId } = req.body;
    if (!req.file) return res.status(400).json({ message: 'PDF receipt file is required' });

    await Registration.findByIdAndUpdate(registrationId, {
      finalReceiptFile: req.file.path,
      fullFeePaid: false, // pending admin confirm
      finalConfirmationMethod: 'upload'
    });
    
    res.json({ message: 'Final receipt uploaded successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Manual confirmation by office staff
router.post('/confirm-manual', async (req, res) => {
  try {
    const { rollNumber, receiptNumber, paymentDate, confirmedBy } = req.body;
    const normalizedRollNumber = (rollNumber || '').trim();
    const normalizedReceiptNumber = (receiptNumber || '').trim();
    const normalizedPaymentDate = paymentDate ? new Date(paymentDate) : null;

    if (!normalizedRollNumber) {
      return res.status(400).json({ message: 'Roll number or staff ID is required' });
    }
    if (!normalizedReceiptNumber) {
      return res.status(400).json({ message: 'Receipt number is required' });
    }
    if (!paymentDate || Number.isNaN(normalizedPaymentDate.getTime())) {
      return res.status(400).json({ message: 'Date of payment is required and must be valid' });
    }

    let payment = await Payment.findOne({ rollNumber: normalizedRollNumber });
    if (!payment) {
      payment = new Payment({
        registration: null,
        rollNumber: normalizedRollNumber,
        receiptNumber: normalizedReceiptNumber,
        paymentDate: normalizedPaymentDate,
        paidStatus: 'pending'
      });
    }

    if (payment.receiptNumber && normalizedReceiptNumber && payment.receiptNumber !== normalizedReceiptNumber) {
      return res.status(400).json({ message: 'Receipt number does not match this roll number or staff ID' });
    }

    if (normalizedReceiptNumber) {
      payment.receiptNumber = normalizedReceiptNumber;
    }
    payment.paymentDate = normalizedPaymentDate;

    payment.paidStatus = 'confirmed';
    payment.confirmationMethod = 'manual';
    payment.confirmedBy = confirmedBy || 'Office Staff';
    payment.confirmedAt = new Date();
    await payment.save();

    res.json({ message: `Payment confirmed for ${normalizedRollNumber}`, payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk confirmation
router.post('/bulk-confirm', async (req, res) => {
  try {
    const { rollNumbers, entries, confirmedBy } = req.body;
    const normalizedEntries = Array.isArray(entries)
      ? entries
      : Array.isArray(rollNumbers)
        ? rollNumbers.map(rollNumber => ({ rollNumber }))
        : [];

    if (normalizedEntries.length === 0) {
      return res.status(400).json({ message: 'Provide at least one roll number' });
    }

    const results = { confirmed: [], failed: [] };

    for (const entry of normalizedEntries) {
      try {
        const rollNumber = (entry.rollNumber || '').trim();
        const receiptNumber = (entry.receiptNumber || '').trim();

        if (!rollNumber) {
          results.failed.push({ rollNumber: '', error: 'Roll number is required' });
          continue;
        }

        let payment = await Payment.findOne({ rollNumber });
        if (!payment) {
          if (!receiptNumber) {
            throw new Error('Receipt number is required when no existing payment record is found');
          }
          const registration = await Registration.findOne({
            $or: [{ registerNumber: rollNumber }, { employeeId: rollNumber }]
          });
          payment = new Payment({
            registration: registration?._id,
            rollNumber,
            receiptNumber,
            paidStatus: 'confirmed',
            confirmationMethod: 'bulk',
            confirmedBy: confirmedBy || 'Office Staff',
            confirmedAt: new Date()
          });
        } else {
          if (receiptNumber && payment.receiptNumber && payment.receiptNumber !== receiptNumber) {
            throw new Error('Receipt number does not match this roll number or staff ID');
          }
          if (receiptNumber) {
            payment.receiptNumber = receiptNumber;
          }
          payment.paidStatus = 'confirmed';
          payment.confirmationMethod = 'bulk';
          payment.confirmedBy = confirmedBy || 'Office Staff';
          payment.confirmedAt = new Date();
        }
        await payment.save();

        // Update registration
        const registration = await Registration.findOne({
          $or: [{ registerNumber: rollNumber }, { employeeId: rollNumber }]
        });
        if (registration) {
          registration.advancePaid = true;
          registration.advanceConfirmationMethod = 'bulk';
          if (payment.receiptNumber) {
            registration.advanceReceiptNumber = payment.receiptNumber;
          }
          await registration.save();
        }
        results.confirmed.push(rollNumber);
      } catch (err) {
        results.failed.push({ rollNumber: (entry.rollNumber || '').trim(), error: err.message });
      }
    }

    res.json({
      message: `Confirmed ${results.confirmed.length} payments`,
      results
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check payment status
router.get('/status/:rollNumber', async (req, res) => {
  try {
    const payment = await Payment.findOne({ rollNumber: req.params.rollNumber })
      .populate('registration');
    if (!payment) {
      return res.status(404).json({ message: 'No payment record found', paidStatus: 'not_found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all payments
router.get('/all', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { paidStatus: status } : {};
    const payments = await Payment.find(query)
      .populate('registration', 'name userType registerNumber employeeId')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
