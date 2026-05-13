const express = require('express');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx');
const router = express.Router();
const Payment = require('../models/Payment');
const Registration = require('../models/Registration');

// Configure multer for Excel uploads
const excelUpload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheetml') || file.originalname.match(/\.(xlsx|xls|csv)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  }
});

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
    const { rollNumber, registrationId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'PDF receipt file is required' });
    }

    // Find or create payment record
    let payment = await Payment.findOne({ rollNumber });
    if (payment) {
      payment.receiptFile = req.file.path;
      payment.paidStatus = 'uploaded';
      payment.confirmationMethod = 'upload';
    } else {
      payment = new Payment({
        registration: registrationId,
        rollNumber,
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
        advanceConfirmationMethod: 'upload'
      });
    }

    res.json({ message: 'Receipt uploaded successfully', paymentId: payment._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit cancellation request
router.post('/cancel-request', upload.single('letter'), async (req, res) => {
  try {
    const { registrationId, reason } = req.body;
    if (!registrationId) return res.status(400).json({ message: 'Registration ID required' });
    
    await Registration.findByIdAndUpdate(registrationId, {
      cancellationRequested: true,
      cancellationReason: reason,
      cancellationLetter: req.file ? req.file.path : null
    });
    
    res.json({ message: 'Cancellation request submitted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload excel for bulk update
router.post('/upload-excel/:type', excelUpload.single('file'), async (req, res) => {
  try {
    const { type } = req.params; // 'advance' or 'final'
    if (!req.file) return res.status(400).json({ message: 'Excel file required' });
    
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    
    // Assume roll numbers are in the first column
    const rollNumbers = data.map(row => row[0]).filter(Boolean).map(String).map(s => s.trim());
    
    const results = { confirmed: [], failed: [] };
    
    for (const rollNumber of rollNumbers) {
      if (rollNumber.toLowerCase() === 'roll number' || rollNumber.toLowerCase() === 'rollno' || rollNumber.toLowerCase() === 'id') continue;
      try {
        const registration = await Registration.findOne({
          $or: [{ registerNumber: rollNumber }, { employeeId: rollNumber }]
        });
        
        if (registration) {
          if (type === 'advance') {
            if (registration.receiptFile) {
              registration.advancePaid = true;
              registration.advanceConfirmationMethod = 'bulk';
            } else {
              results.failed.push({ rollNumber, error: 'Advance slip not uploaded by user' });
              continue;
            }
          } else if (type === 'final') {
            if (registration.finalReceiptFile) {
              registration.fullFeePaid = true;
              registration.finalConfirmationMethod = 'bulk';
            } else {
              results.failed.push({ rollNumber, error: 'Final slip not uploaded by user' });
              continue;
            }
          }
          await registration.save();
          results.confirmed.push(rollNumber);
        } else {
          results.failed.push({ rollNumber, error: 'Registration not found' });
        }
      } catch (err) {
        results.failed.push({ rollNumber, error: err.message });
      }
    }
    
    res.json({ message: `Excel processed: Confirmed ${results.confirmed.length} payments.`, results });
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
    const { rollNumber, confirmedBy } = req.body;

    let payment = await Payment.findOne({ rollNumber });
    if (!payment) {
      // Create new payment entry for manual confirmation
      const registration = await Registration.findOne({
        $or: [{ registerNumber: rollNumber }, { employeeId: rollNumber }]
      });

      payment = new Payment({
        registration: registration?._id,
        rollNumber,
        paidStatus: 'confirmed',
        confirmationMethod: 'manual',
        confirmedBy: confirmedBy || 'Office Staff',
        confirmedAt: new Date()
      });
    } else {
      payment.paidStatus = 'confirmed';
      payment.confirmationMethod = 'manual';
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
      registration.advanceConfirmationMethod = 'manual';
      await registration.save();
    }

    res.json({ message: `Payment confirmed for ${rollNumber}`, payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk confirmation
router.post('/bulk-confirm', async (req, res) => {
  try {
    const { rollNumbers, confirmedBy } = req.body;

    if (!Array.isArray(rollNumbers) || rollNumbers.length === 0) {
      return res.status(400).json({ message: 'Provide an array of roll numbers' });
    }

    const results = { confirmed: [], failed: [] };

    for (const rollNumber of rollNumbers) {
      try {
        let payment = await Payment.findOne({ rollNumber });
        if (!payment) {
          const registration = await Registration.findOne({
            $or: [{ registerNumber: rollNumber }, { employeeId: rollNumber }]
          });
          payment = new Payment({
            registration: registration?._id,
            rollNumber,
            paidStatus: 'confirmed',
            confirmationMethod: 'bulk',
            confirmedBy: confirmedBy || 'Office Staff',
            confirmedAt: new Date()
          });
        } else {
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
          await registration.save();
        }
        results.confirmed.push(rollNumber);
      } catch (err) {
        results.failed.push({ rollNumber, error: err.message });
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
