const express = require('express')
const router = express.Router()
const Suggestion = require('../models/Suggestion')

// Create a new suggestion
router.post('/', async (req, res) => {
  try {
    const { registerNumber, mailId, routeSuggestion } = req.body || {}
    if (!registerNumber || !mailId || !routeSuggestion) {
      return res.status(400).json({ message: 'registerNumber, mailId and routeSuggestion are required' })
    }

    const normalizedMail = (mailId || '').toString().trim().toLowerCase()
    if (!normalizedMail.endsWith('@psgitech.ac.in') && !normalizedMail.endsWith('@psgiap.ac.in')) {
      return res.status(400).json({ message: 'Email must be from psgitech.ac.in or psgiap.ac.in' })
    }

    // Accept either a student register number (starts with 715, 12 digits) OR an employee/staff ID
    let regDigits = null
    let empId = null
    if (registerNumber) {
      const r = registerNumber.toString().trim()
      const digits = r.replace(/\D/g, '')
      if (/^715\d{9}$/.test(digits)) {
        regDigits = digits
      } else {
        // treat as employee id if not student reg
        empId = r.toLowerCase()
      }
    }
    // If registerNumber is not provided but employeeId field is sent, accept that
    if (!regDigits && !empId && req.body.employeeId) {
      empId = (req.body.employeeId || '').toString().trim().toLowerCase()
    }

    // Validate employee id (basic normalization and allowed chars) if present
    if (!regDigits && !empId) {
      return res.status(400).json({ message: 'Provide a valid register number (starts with 715) or an employee ID' })
    }

    if (empId && !/^[a-z0-9@._\-]{2,40}$/.test(empId)) {
      return res.status(400).json({ message: 'Employee ID contains invalid characters' })
    }

    const suggestion = new Suggestion({ registerNumber: regDigits, employeeId: empId, mailId: normalizedMail, routeSuggestion: routeSuggestion.toString().trim() })
    await suggestion.save()
    res.status(201).json({ message: 'Suggestion received', suggestionId: suggestion._id })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// (Optional) Admin: list suggestions - protected routes could be added later
router.get('/', async (req, res) => {
  try {
    const list = await Suggestion.find().sort({ createdAt: -1 }).limit(1000)
    res.json(list)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
