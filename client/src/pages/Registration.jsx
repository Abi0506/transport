import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import GuidelinesStep from '../components/GuidelinesStep'
import InstructionsStep from '../components/InstructionsStep'

const STUDENT_DEPARTMENTS = [
  'B.Arch',
  'B.Des',
  'B.E CSE',
  'B.E Civil',
  'B.E ECE',
  'B.E EEE',
  'B.E ICE',
  'B.E Mech',
  'B.E ROAI',
  'B.Tech AIDS',
  'B.Tech CSBS',
  'B.Tech VLSI',
  'M.E CSE',
  'M.E Design',
  'M.E Structural'
]

// Boarding points stay hardcoded; OTPs still go through the live API.
const USE_HARDCODED_BOARDING_POINTS = true
const USE_HARDCODED_OTP_ROUTES = false

const FACULTY_DEPARTMENTS = [
  'AIDS',
  'Arch',
  'B.Des',
  'CC',
  'CDC',
  'Chem',
  'Civil',
  'CMC',
  'CSBS',
  'CSE',
  'Convention',
  'ECE',
  'EEE',
  'English',
  'Engineering Design',
  'Exam cell',
  'Hostel',
  'ICE',
  'IQAC',
  'Library',
  'Maintenance',
  'Maths',
  'Mech',
  'Museum',
  'Office',
  'Office of Academic',
  'PE',
  'Power',
  'Physics',
  'ROAI',
  'Stores',
  'Structural',
  'TQM',
  'Transport',
  'VLSI',
  'Wellness Centre'
]

const DESIGNATIONS = [
  'Adjunct Faculty',
  'Asst Manager-Corporate Relations and Placement',
  'Asst Physical Director',
  'Assistant',
  'Assistant Librarian',
  'Assistant Professor',
  'Assistant Professor (Sel Gr)',
  'Assistant Professor (Senior Grade)',
  'Assistant Security Officer',
  'Associate Professor',
  'Attendant',
  'Coordinator',
  'Counsellor',
  'Director-Examinations',
  'Electrical Supervisor',
  'Electrician',
  'Engineer',
  'Facility Executive',
  'Foreman Instructor',
  'Head - Convention Services',
  'HR',
  'IT Support Engineer',
  'Instructor',
  'Jr Maint Assist (Electrical)',
  'Jr Maint Engineer',
  'Junior Assistant',
  'Junior Maintenance Assistant',
  'Lab Assistant',
  'Librarian',
  'Maintenance Engineer',
  'Maintenance Supervisor',
  'Office Superintendent',
  'Physical Director',
  'Principal',
  'Professor',
  'Professor of Practice',
  'Project Engineer',
  'Research Assistant',
  'Research Associate',
  'Research Scholar',
  'Secretary',
  'Security',
  'Security Officer',
  'Senior Assistant',
  'Senior Executive - Sales & Marketing',
  'Senior Lab Technician',
  'Senior Mechanic',
  'Staff Nurse',
  'Store Keeper',
  'System Administrator',
  'Teaching Assistant',
  'Technical Assistant',
  'Technical Assistant (Systems)',
  'Technical Operator',
  'Technician',
  'Transport Officer',
  'Vigilance Officer',
  'Visting Professor',
  'Web-Designer'
]

// Explicit faculty-only designations requested by the user
const FACULTY_DESIGNATIONS = [
  'Adjunct Faculty',
  'Assistant Professor',
  'Assistant Professor (Sel Gr)',
  'Assistant Professor (Senior Grade)',
  'Associate Professor',
  'Professor',
  'Professor of Practice'
]

// Remaining items are staff designations
const STAFF_DESIGNATIONS = DESIGNATIONS.filter(d => !FACULTY_DESIGNATIONS.includes(d))

// Hardcoded boarding points (fallback / development data extracted from Excel)
const HARDCODED_ROUTES = [
  {
    routeId: 'R1',
    routeNumber: 'R1',
    routeName: 'Kuniamuthur',
    capacity: 55,
    stops: [
      { name: 'Koaviputhur Pirivu', fees: 49500, time: '7:05 AM', distanceOrder: 1 },
      { name: 'Kuniamuthur', fees: 49500, time: '7:10 AM', distanceOrder: 2 },
      { name: 'Athupalam', fees: 49500, time: '7:15 AM', distanceOrder: 3 },
      { name: 'Ukkadam', fees: 40000, time: '7:20 AM', distanceOrder: 4 },
      { name: 'Chinthamani Bus Stop', fees: 36000, time: '7:30 AM', distanceOrder: 5 },
      { name: 'Ramanathapuram', fees: 36000, time: '7:40 AM', distanceOrder: 6 },
      { name: 'Central Studio', fees: 36000, time: '7:45 AM', distanceOrder: 7 }
    ]
  },
  {
    routeId: 'R2',
    routeNumber: 'R2',
    routeName: 'Vadavalli',
    capacity: 55,
    stops: [
      { name: 'Bharathiyar University', fees: 55500, time: '7:05 AM', distanceOrder: 1 },
      { name: 'Vadavalli Roundana', fees: 55500, time: '7:20 AM', distanceOrder: 2 },
      { name: 'P.N.Pudur', fees: 55500, time: '7:25 AM', distanceOrder: 3 },
      { name: 'Lawley Road', fees: 55500, time: '7:30 AM', distanceOrder: 4 },
      { name: 'R.S.Puram', fees: 55500, time: '7:35 AM', distanceOrder: 5 },
      { name: 'Chinthamani / Vadakovai', fees: 55500, time: '7:40 AM', distanceOrder: 6 }
    ]
  },
  {
    routeId: 'R3',
    routeNumber: 'R3',
    routeName: 'Peelamedu (NEW)',
    capacity: 55,
    stops: [
      { name: 'Peelamedu', fees: 38000, time: '7:45 AM', distanceOrder: 1 },
      { name: 'Hopes', fees: 38000, time: '7:55 AM', distanceOrder: 2 },
      { name: 'KMCH', fees: 36000, time: '8:00 AM', distanceOrder: 3 },
      { name: 'PLS Nagar', fees: 36000, time: '8:04 AM', distanceOrder: 4 }
    ]
  },
  {
    routeId: 'R4',
    routeNumber: 'R4',
    routeName: 'Karamadai',
    capacity: 55,
    stops: [
      { name: 'Karamadai', fees: 57000, time: '6:55 AM', distanceOrder: 1 },
      { name: 'Periyanaickenpalayam', fees: 57000, time: '7:15 AM', distanceOrder: 2 },
      { name: 'Narasimmanaickenpalayam', fees: 57000, time: '7:20 AM', distanceOrder: 3 },
      { name: 'NGGO Colony', fees: 50000, time: '7:25 AM', distanceOrder: 4 },
      { name: 'Vellakinar', fees: 50000, time: '7:35 AM', distanceOrder: 5 },
      { name: 'Athipalayam Pirivu', fees: 48000, time: '7:40 AM', distanceOrder: 6 },
      { name: 'Chinnavedampatti Pirivu', fees: 48000, time: '7:45 AM', distanceOrder: 7 }
    ]
  },
  {
    routeId: 'R5',
    routeNumber: 'R5',
    routeName: 'Tirupur via Avinashi',
    capacity: 55,
    stops: [
      { name: 'Tirupur - Kumar Nagar', fees: 50500, time: '7:15 AM', distanceOrder: 1 },
      { name: 'SAP Theatre', fees: 50500, time: '7:18 AM', distanceOrder: 2 },
      { name: 'Gandhinagar', fees: 50500, time: '7:20 AM', distanceOrder: 3 },
      { name: 'Anupparpalayam', fees: 50500, time: '7:25 AM', distanceOrder: 4 },
      { name: 'Poondi', fees: 50500, time: '7:30 AM', distanceOrder: 5 }
    ]
  },
  {
    routeId: 'R6',
    routeNumber: 'R6',
    routeName: 'Tirupur OBS / Palladam',
    capacity: 57,
    stops: [
      { name: 'Tirupur OBS', fees: 54500, time: '7:00 AM', distanceOrder: 1 },
      { name: 'Veerapandi Pirivu', fees: 54500, time: '7:10 AM', distanceOrder: 2 },
      { name: 'Palladam Bus Stand', fees: 50500, time: '7:25 AM', distanceOrder: 3 },
      { name: 'Lakshmi Mills (KN Puram)', fees: 50500, time: '7:35 AM', distanceOrder: 4 },
      { name: 'Karanampettai', fees: 41000, time: '7:40 AM', distanceOrder: 5 },
      { name: 'Defence Colony', fees: 36000, time: '7:42 AM', distanceOrder: 6 },
      { name: 'Sulur', fees: 36000, time: '7:50 AM', distanceOrder: 7 },
      { name: 'Pappampatti Pirivu', fees: 36000, time: '7:55 AM', distanceOrder: 8 }
    ]
  },
  {
    routeId: 'R7',
    routeNumber: 'R7',
    routeName: 'Pollachi',
    capacity: 44,
    stops: [
      { name: 'Pollachi', fees: 57500, time: '6:55 AM', distanceOrder: 1 },
      { name: 'Kovilpalayam', fees: 52500, time: '7:05 AM', distanceOrder: 2 },
      { name: 'Thamaraikulam', fees: 50500, time: '7:15 AM', distanceOrder: 3 },
      { name: 'Kinathukadavu', fees: 50500, time: '7:20 AM', distanceOrder: 4 },
      { name: 'Othakkalmandapam', fees: 47500, time: '7:25 AM', distanceOrder: 5 },
      { name: 'Malumichampatti', fees: 47500, time: '7:30 AM', distanceOrder: 6 },
      { name: 'Karpagam University', fees: 47500, time: '7:35 AM', distanceOrder: 7 },
      { name: 'Vellalore Pirivu (L&T Bypass)', fees: 40000, time: '7:45 AM', distanceOrder: 8 }
    ]
  },
  {
    routeId: 'R8',
    routeNumber: 'R8',
    routeName: 'Ganapathy',
    capacity: 55,
    stops: [
      { name: 'Ganapathy', fees: 42000, time: '7:20 AM', distanceOrder: 1 },
      { name: 'Athipalayam Pirivu', fees: 42000, time: '7:25 AM', distanceOrder: 2 },
      { name: 'Bharathipuram', fees: 42000, time: '7:25 AM', distanceOrder: 3 },
      { name: 'Cheran Maanagar', fees: 40000, time: '7:35 AM', distanceOrder: 4 },
      { name: 'Thanneerpandal', fees: 40000, time: '7:50 AM', distanceOrder: 5 }
    ]
  },
  {
    routeId: 'R9',
    routeNumber: 'R9',
    routeName: 'Annur',
    capacity: 55,
    stops: [
      { name: 'Annur', fees: 50000, time: '7:10 AM', distanceOrder: 1 },
      { name: 'Kariyampalayam Pirivu', fees: 50000, time: '7:15 AM', distanceOrder: 2 },
      { name: 'Ganesa Puram (Sakthi Road)', fees: 50000, time: '7:20 AM', distanceOrder: 3 },
      { name: 'Kovilpalayam (Sakthi Road)', fees: 50000, time: '7:30 AM', distanceOrder: 4 },
      { name: 'Kurumbapalayam (Sakthi Road)', fees: 48000, time: '7:35 AM', distanceOrder: 5 },
      { name: 'Saravanampatti', fees: 48000, time: '7:40 AM', distanceOrder: 6 },
      { name: 'Vilankurichi', fees: 40000, time: '7:45 AM', distanceOrder: 7 },
      { name: 'Kalapatti', fees: 36000, time: '7:53 AM', distanceOrder: 8 },
      { name: 'Nehru Nagar', fees: 36000, time: '7:58 AM', distanceOrder: 9 }
    ]
  },
  {
    routeId: 'R10',
    routeNumber: 'R10',
    routeName: 'Perur',
    capacity: 55,
    stops: [
      { name: 'Perur', fees: 48000, time: '7:05 AM', distanceOrder: 1 },
      { name: 'Telungupalayam Pirivu', fees: 48000, time: '7:10 AM', distanceOrder: 2 },
      { name: 'Selvapuram', fees: 48000, time: '7:15 AM', distanceOrder: 3 },
      { name: 'Townhall', fees: 40000, time: '7:25 AM', distanceOrder: 4 },
      { name: 'Varatharajapuram', fees: 36000, time: '7:45 AM', distanceOrder: 5 },
      { name: 'ESI & Lions', fees: 36000, time: '7:50 AM', distanceOrder: 6 },
      { name: 'Ramanujanagar', fees: 36000, time: '7:51 AM', distanceOrder: 7 },
      { name: "Mani's Theatre", fees: 36000, time: '7:58 AM', distanceOrder: 8 }
    ]
  },
  {
    routeId: 'R11',
    routeNumber: 'R11',
    routeName: 'Kanuvai',
    capacity: 55,
    stops: [
      { name: 'Kanuvai', fees: 50000, time: '7:00 AM', distanceOrder: 1 },
      { name: 'TVS Nagar', fees: 50000, time: '7:10 AM', distanceOrder: 2 },
      { name: 'Edayarpalayam', fees: 50000, time: '7:15 AM', distanceOrder: 3 },
      { name: 'Venkitapuram', fees: 50000, time: '7:20 AM', distanceOrder: 4 },
      { name: 'Saibaba Colony', fees: 50000, time: '7:25 AM', distanceOrder: 5 },
      { name: 'Saibaba Koil', fees: 50000, time: '7:30 AM', distanceOrder: 6 },
      { name: 'Nava India', fees: 42000, time: '7:47 AM', distanceOrder: 7 }
    ]
  },
  {
    routeId: 'R12',
    routeNumber: 'R12',
    routeName: 'Avinashi (NEW)',
    capacity: 44,
    stops: [
      { name: 'Avinashi NBS', fees: 42000, time: '7:30 AM', distanceOrder: 1 },
      { name: 'Avinashi OBS', fees: 42000, time: '7:35 AM', distanceOrder: 2 },
      { name: 'Thekkalur', fees: 42000, time: '7:40 AM', distanceOrder: 3 },
      { name: 'Karumathampatti', fees: 31000, time: '7:55 AM', distanceOrder: 4 }
    ]
  },
  {
    routeId: 'R13',
    routeNumber: 'R13',
    routeName: 'Thudiyalur (NEW)',
    capacity: 55,
    stops: [
      { name: 'Thudiyalur', fees: 50000, time: '7:15 AM', distanceOrder: 1 },
      { name: 'Kavundampalayam', fees: 50000, time: '7:20 AM', distanceOrder: 2 },
      { name: 'Krishna Silks - 100 ft Road', fees: 42000, time: '7:30 AM', distanceOrder: 3 }
    ]
  },
  {
    routeId: 'R14',
    routeNumber: 'R14',
    routeName: 'Podanur (NEW)',
    capacity: 55,
    stops: [
      { name: 'Podanur', fees: 40000, time: '7:15 AM', distanceOrder: 1 },
      { name: 'Nanjundapuram', fees: 40000, time: '7:20 AM', distanceOrder: 2 },
      { name: 'Singanallur', fees: 36000, time: '7:40 AM', distanceOrder: 3 },
      { name: 'Ondipudur', fees: 36000, time: '7:50 AM', distanceOrder: 4 },
      { name: 'Irugur Pirivu', fees: 36000, time: '7:55 AM', distanceOrder: 5 }
    ]
  },
  {
    routeId: 'R15',
    routeNumber: 'R15',
    routeName: 'Gandhipuram',
    capacity: 55,
    stops: [
      { name: 'Gandhipuram', fees: 42000, time: '7:25 AM', distanceOrder: 1 },
      { name: 'Pap.N.Palayam', fees: 42000, time: '7:30 AM', distanceOrder: 2 },
      { name: 'Lakshmi Mills (Avinashi Road)', fees: 42000, time: '7:35 AM', distanceOrder: 3 },
      { name: 'Esso Bunk', fees: 38000, time: '7:40 AM', distanceOrder: 4 },
      { name: 'Fun Mall', fees: 38000, time: '7:45 AM', distanceOrder: 5 },
      { name: 'SITRA', fees: 36000, time: '7:55 AM', distanceOrder: 6 }
    ]
  }
]

const BOARDING_POINTS = [...new Map(
  HARDCODED_ROUTES.flatMap(route =>
    route.stops.map(stop => [
      stop.name.trim().toLowerCase(),
      { ...stop, routeId: route.routeId, routeName: route.routeName }
    ])
  )
).values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

export default function Registration() {
  const { userType } = useParams()
  const navigate = useNavigate()
  const storageKey = `registration-draft-${userType}`
  
  // Initialize step with session persistence
  const [step, setStep] = useState(() => {
    const savedStep = sessionStorage.getItem(`registration-step-${userType}`)
    return savedStep ? parseInt(savedStep) : 1
  })
  
  const [routes, setRoutes] = useState(HARDCODED_ROUTES)
  const [selectedRoute, setSelectedRoute] = useState('')
  const [selectedStop, setSelectedStop] = useState(null)
  const [searchStop, setSearchStop] = useState('')
  const [advanceReceiptFile, setAdvanceReceiptFile] = useState(null)
  const [advanceReceiptNumber, setAdvanceReceiptNumber] = useState('')
  const [advanceDecision, setAdvanceDecision] = useState('')
  const [advanceReceiptValidationError, setAdvanceReceiptValidationError] = useState('')
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false)
  const [instructionsAccepted, setInstructionsAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [toast, setToast] = useState(null)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [yearCategory, setYearCategory] = useState('') // 'phase_ii', 'phase_i'
  const [rollNumberVerified, setRollNumberVerified] = useState(false)
  const [verifyingRoll, setVerifyingRoll] = useState(false)
  const [finalReceiptFile, setFinalReceiptFile] = useState(null)
  const [finalReceiptNumber, setFinalReceiptNumber] = useState('')
  const [finalPaymentDate, setFinalPaymentDate] = useState('')
  const [governmentSponsored, setGovernmentSponsored] = useState(false)
  const [routesLoadError, setRoutesLoadError] = useState('')

  const [form, setForm] = useState({
    name: '', dateOfBirth: '', address: '', pincode: '',
    phoneNumber: '', emergencyPhoneNumber: '', mailId: '',
    department: '', institution: 'PSG iTech', boardingPoint: '',
    registerNumber: '', gender: 'Male', academicYear: '',
    employeeId: '', category: '', designation: '', employeeType: 'faculty'
  })

  const isStudent = userType === 'student'
  const isEmployee = userType === 'employee'
  const isFaculty = isEmployee && form.employeeType === 'faculty'
  const isStaff = isEmployee && form.employeeType === 'staff'
  const concession = isFaculty ? 50 : isStaff ? 80 : 0
  const sortedRoutes = [...routes].sort((a, b) => a.routeName.localeCompare(b.routeName, undefined, { numeric: true, sensitivity: 'base' }))
  const filteredBoardingPoints = BOARDING_POINTS.filter(stop => stop.name.toLowerCase().includes(searchStop.toLowerCase()))
  // Department lists per institution (faculty-specific)
  const PSG_ITECH_DEPARTMENTS = [
    'AIDS',
    'Architecture',
    'B. Design',
    'Chemistry',
    'Civil',
    'CSBS',
    'CSE',
    'ECE',
    'ECE VLSI',
    'EEE',
    'English',
    'Humanities',
    'ICE',
    'Mathematics',
    'Mech',
    'Physics',
    'ROAI'
  ]
  const PSG_IAP_DEPARTMENTS = ['Arch']

  const visibleDepartments = isStudent
    ? STUDENT_DEPARTMENTS
    : isFaculty
      ? (form.institution === 'PSG IAP' ? PSG_IAP_DEPARTMENTS : PSG_ITECH_DEPARTMENTS)
      : FACULTY_DEPARTMENTS

  useEffect(() => {
    const savedDraft = sessionStorage.getItem(storageKey)
    if (!savedDraft) return

    try {
      const draft = JSON.parse(savedDraft)
      if (draft.form) setForm(prev => ({ ...prev, ...draft.form }))
      if (typeof draft.selectedRoute === 'string') setSelectedRoute(draft.selectedRoute)
      if (draft.selectedStop) setSelectedStop(draft.selectedStop)
      if (typeof draft.searchStop === 'string') setSearchStop(draft.searchStop)
      if (typeof draft.guidelinesAccepted === 'boolean') setGuidelinesAccepted(draft.guidelinesAccepted)
      if (typeof draft.instructionsAccepted === 'boolean') setInstructionsAccepted(draft.instructionsAccepted)
      if (typeof draft.advanceDecision === 'string') setAdvanceDecision(draft.advanceDecision)
      if (typeof draft.otpSent === 'boolean') setOtpSent(draft.otpSent)
      if (typeof draft.otp === 'string') setOtp(draft.otp)
      if (typeof draft.step === 'number') setStep(draft.step)
    } catch {
      sessionStorage.removeItem(storageKey)
      sessionStorage.removeItem(`registration-step-${userType}`)
    }
  }, [storageKey, userType])

  useEffect(() => {
    if (USE_HARDCODED_BOARDING_POINTS) return

    axios.get('/api/auth/routes')
      .then(res => {
        console.log('Loaded routes:', res.data);
        setRoutes(res.data)
        setRoutesLoadError('')
      })
      .catch(err => {
        const message = err.response?.data?.message || err.message || 'Failed to load bus routes'
        setRoutes(HARDCODED_ROUTES)
        setRoutesLoadError(message)
        setToast({ type: 'error', msg: `Could not load bus routes, using fallback data: ${message}` })
        console.error('Failed to load bus routes', err)
      })
  }, [])

  // Save step to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem(`registration-step-${userType}`, step.toString())
  }, [step, userType])


  useEffect(() => {
    return () => {
      sessionStorage.removeItem(storageKey)
      sessionStorage.removeItem(`registration-step-${userType}`)
    }
  }, [storageKey, userType])

  // Function to validate and extract academic year from register number
  const validateRegisterNumber = (regNum) => {
    // Must be 12 digits, start with 7155 or 7158
    if (!/^\d{12}$/.test(regNum) || !(regNum.startsWith('7155') || regNum.startsWith('7158'))) {
      return { valid: false, academicYear: null, error: 'Register Number must be 12 digits and start with 7155 or 7158' }
    }

    // Extract year code (digits 5-6)
    const yearCode = regNum.substring(4, 6)
    // Map year codes to academic year (allowed: 22,23,24,25)
    const yearMap = { '22': '5', '23': '4', '24': '3', '25': '2' }

    if (!yearMap[yearCode]) {
      return { valid: false, academicYear: null, error: `Invalid year code '${yearCode}'. Only 22, 23, 24, 25 are allowed` }
    }

    return { valid: true, academicYear: yearMap[yearCode], error: null }
  }
  // Basic validators for phone and pincode
  const isValidPhone = (num) => /^\d{10}$/.test((num || '').trim())
  const isValidPincode = (p) => /^\d{6}$/.test((p || '').trim())
  const isValidEmployeeId = (id) => /^[IA]\d{4}$/i.test((id || '').toString().trim())
  const handleChange = (e) => {
    // Student register number handling
    if (e.target.name === 'registerNumber' && isStudent) {
      const regNum = e.target.value

      // Allow only digits
      if (!/^\d*$/.test(regNum)) return

      // Auto-validate and populate academic year
      if (regNum.length === 12) {
        const validation = validateRegisterNumber(regNum)
        if (validation.valid) {
          setForm({ ...form, registerNumber: regNum, academicYear: validation.academicYear })
        } else {
          setToast({ type: 'error', msg: validation.error })
        }
      } else {
        setForm({ ...form, registerNumber: regNum })
        if (regNum !== form.registerNumber) setRollNumberVerified(false)
      }
      return
    }

    // Employee ID sanitization for faculty only
    if (e.target.name === 'employeeId' && isFaculty) {
      const raw = e.target.value
      // Allow only digits and leading 'I'/'A' (case-insensitive)
      let next = raw.replace(/[^0-9iIaA]/g, '')
      // If starts with i/I/a/A, normalize to uppercase prefix and keep digits
      if (/^[iIaA]/.test(next)) {
        const prefix = next[0].toUpperCase()
        const rest = next.slice(1).replace(/[^0-9]/g, '')
        next = prefix + rest
      }
      // If user typed digits without prefix, force an 'I' prefix for consistency
      if (next.length > 0 && !/^[IA]/.test(next)) {
        next = 'I' + next.replace(/[^0-9]/g, '')
      }
      // Keep max length 5 (1 letter + 4 digits)
      next = next.slice(0, 5)
      // If only a single letter present (e.g., 'I' or 'A'), allow it as intermediate input
      if (next.length === 1 && !/^[IA]$/.test(next)) return
      setForm({ ...form, employeeId: next })
      return
    }

    // Mail ID handling for student email inline validation
    if (e.target.name === 'mailId' && isStudent) {
      const email = e.target.value
      setForm({ ...form, mailId: email })
      return
    }

    // Default handler
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const selectStop = (stop, routeId) => {
    setSelectedStop(stop)
    setForm({ ...form, boardingPoint: stop.name })
    setSelectedRoute(routeId)
  }

  const getFinalFee = () => {
    if (!selectedStop) return 0
    return selectedStop.fees * (1 - concession / 100)
  }

  const getAdvanceAmount = () => (isStudent ? 5000 : 0)

  const getPayableAmount = () => {
    if (isStudent) return Math.max(0, getFinalFee() - getAdvanceAmount())
    return getFinalFee()
  }


  useEffect(() => {
    const draft = {
      form,
      selectedRoute,
      selectedStop,
      searchStop,
      guidelinesAccepted,
      instructionsAccepted,
      advanceDecision,
      otpSent,
      otp,
      step
    }

    sessionStorage.setItem(storageKey, JSON.stringify(draft))
  }, [storageKey, form, selectedRoute, selectedStop, searchStop, guidelinesAccepted, instructionsAccepted, advanceDecision, otpSent, otp, step])

  // If institution changes and current department is no longer allowed, reset it.
  useEffect(() => {
    const allowed = isStudent
      ? STUDENT_DEPARTMENTS
      : isFaculty
        ? (form.institution === 'PSG IAP' ? PSG_IAP_DEPARTMENTS : PSG_ITECH_DEPARTMENTS)
        : FACULTY_DEPARTMENTS

    if (form.department && !allowed.includes(form.department)) {
      setForm(prev => ({ ...prev, department: '' }))
    }
  }, [form.institution, isFaculty, isStudent])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const stepLabels = isStudent 
    ? ['Year Selection', 'Register Number', 'Guidelines', 'Instructions', 'Details', 'Boarding Point', 'Advance Payment', 'Final Fee', 'Review', 'Success']
    : ['Guidelines', 'Instructions', 'Details', 'Boarding Point', 'Review', 'Success']

  const handleSendOtp = async () => {
    setSubmitting(true)
    try {
      if (USE_HARDCODED_OTP_ROUTES) {
        // Simulate OTP being sent during local debugging
        setOtpSent(true)
        setOtp('')
        setToast({ type: 'success', msg: 'OTP (simulated) sent to ' + form.mailId })
      } else {
        await axios.post('/api/otp/send', { email: form.mailId })
        setOtpSent(true)
        setOtp('')
        setToast({ type: 'success', msg: 'OTP sent to ' + form.mailId })
      }
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Failed to send OTP' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResendOtp = async () => {
    setOtp('')
    setSubmitting(true)
    try {
      if (USE_HARDCODED_OTP_ROUTES) {
        setToast({ type: 'success', msg: 'OTP (simulated) resent to ' + form.mailId })
        setOtpSent(true)
      } else {
        await axios.post('/api/otp/send', { email: form.mailId })
        setToast({ type: 'success', msg: 'OTP resent to ' + form.mailId })
      }
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Failed to resend OTP' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    setVerifyingOtp(true)
    try {
      await axios.post('/api/otp/verify', { email: form.mailId, otp })
      
      // Create FormData to include file uploads
      const formData = new FormData()
      formData.append('registration', JSON.stringify({
        ...form,
        employeeId: isFaculty ? form.employeeId.trim().toLowerCase() : form.employeeId,
        boardingPoint: selectedStop?.name,
        guidelinesAccepted,
        instructionsAccepted,
        governmentSponsored,
        advancePaymentDecision: isStudent ? advanceDecision : null,
        advanceReceiptNumber: isStudent ? advanceReceiptNumber : null,
        fullPaymentReceiptNumber: isStudent ? finalReceiptNumber : null,
        fullPaymentDate: isStudent ? finalPaymentDate : null,
        advanceAmount: getAdvanceAmount(),
        payableAmount: getPayableAmount(),
        totalAmount: getFinalFee()
      }))
      
      if (isStudent && advanceReceiptFile) {
        formData.append('advanceReceipt', advanceReceiptFile)
      }
      if (isStudent && finalReceiptFile) {
        formData.append('fullPaymentReceipt', finalReceiptFile)
      }
      
      const endpoint = `/api/register/${isEmployee ? form.employeeType : userType}`
      const res = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
      setStep(isStudent ? 10 : 6)
      
      // Reset form and all state after successful registration
      setForm({
        name: '', dateOfBirth: '', address: '', pincode: '',
        phoneNumber: '', emergencyPhoneNumber: '', mailId: '',
        department: '', institution: 'PSG iTech', boardingPoint: '',
        registerNumber: '', gender: 'Male', academicYear: '',
        employeeId: '', category: '', designation: '', employeeType: 'faculty'
      })
      setSelectedStop(null)
      setAdvanceDecision('')
      setAdvanceReceiptNumber('')
      setAdvanceReceiptValidationError('')
      setAdvanceReceiptFile(null)
      setFinalReceiptFile(null)
      setFinalReceiptNumber('')
      setFinalPaymentDate('')
      setGuidelinesAccepted(false)
      setInstructionsAccepted(false)
      setOtp('')
      setOtpSent(false)
      setYearCategory('')
      setRollNumberVerified(false)
      setSelectedRoute('')
      setSearchStop('')
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Verification or Registration failed' })
    } finally {
      setVerifyingOtp(false)
    }
  }

  const canNext = () => {
    const expectedDomain = form.institution === 'PSG IAP' ? '@psgiap.ac.in' : '@psgitech.ac.in'
    
    if (isStudent) {
      if (step === 1) return !!yearCategory
      if (step === 2) return rollNumberVerified
      if (step === 3) return guidelinesAccepted
      if (step === 4) return instructionsAccepted
      if (step === 5) {
        const base = form.name && form.dateOfBirth && form.address && form.pincode &&
          form.phoneNumber && form.emergencyPhoneNumber && form.mailId && form.department
        if (form.registerNumber.length !== 12 || !(form.registerNumber.startsWith('7155') || form.registerNumber.startsWith('7158'))) return false
        if (!form.mailId.endsWith(expectedDomain)) return false
        const validation = validateRegisterNumber(form.registerNumber)
        if (!isValidPincode(form.pincode)) return false
        if (!isValidPhone(form.phoneNumber) || !isValidPhone(form.emergencyPhoneNumber)) return false
        return base && validation.valid && form.gender && form.academicYear
      }
      if (step === 6) return selectedStop !== null
      if (step === 7) {
        return governmentSponsored || (advanceReceiptFile && advanceReceiptNumber)
      }
      if (step === 8) return finalReceiptFile && finalReceiptNumber && finalPaymentDate
      if (step === 9) return true
      return true
    } else {
      if (step === 1) return guidelinesAccepted
      if (step === 2) return instructionsAccepted
      if (step === 3) {
        if (!form.mailId || !form.mailId.endsWith(expectedDomain)) return false
        if (form.designation && !(form.employeeType === 'faculty' ? FACULTY_DESIGNATIONS.includes(form.designation) : STAFF_DESIGNATIONS.includes(form.designation))) return false
        const base = form.name && form.dateOfBirth && form.address && form.pincode &&
          form.phoneNumber && form.emergencyPhoneNumber && form.mailId && form.department && form.designation
        if (!isValidPincode(form.pincode)) return false
        if (!isValidPhone(form.phoneNumber) || !isValidPhone(form.emergencyPhoneNumber)) return false
        if (isFaculty) {
          return base && isValidEmployeeId(form.employeeId)
        }
        return base && !!form.employeeId
      }
      if (step === 4) return selectedStop !== null
      if (step === 5) return true
      return true
    }
  }

  const [checkingNext, setCheckingNext] = useState(false)

  const handleNext = async () => {
    if (!canNext()) return
    // Prevent duplicate submissions
    setCheckingNext(true)
    try {
      // Student details step: step 5
      if (isStudent && step === 5) {
        try {
          const regRes = await axios.get('/api/register/check-duplicate', {
            params: { field: 'registerNumber', value: form.registerNumber, userType: 'student' }
          })
          if (regRes.data.exists) {
            setToast({ type: 'error', msg: 'Student with this register number already exists' })
            return
          }

        } catch (err) {
          setToast({ type: 'error', msg: err.response?.data?.message || 'Failed to verify registration' })
          return
        }
      }

      // Faculty details step: employee step is 3 for employees
      if (isEmployee && isFaculty && step === 3) {
        try {
          const res = await axios.get('/api/register/check-duplicate', {
            params: { field: 'employeeId', value: form.employeeId, userType: 'faculty' }
          })
          if (res.data.exists) {
            setToast({ type: 'error', msg: 'Faculty with this employee ID already exists' })
            return
          }
        } catch (err) {
          setToast({ type: 'error', msg: err.response?.data?.message || 'Failed to verify registration' })
          return
        }
      }

      if (isStudent && step === 7 && !governmentSponsored) {
        try {
          const receiptCheck = await axios.get('/api/payment/validate-advance', {
            params: {
              rollNumber: form.registerNumber,
              receiptNumber: advanceReceiptNumber
            }
          })
          if (!receiptCheck.data?.valid) {
            setAdvanceReceiptValidationError('Receipt number could not be verified. Please check the office receipt number and try again.')
            setToast({ type: 'error', msg: 'Receipt number could not be verified' })
            return
          }
          setAdvanceReceiptValidationError('')
        } catch (err) {
          const message = err.response?.data?.message || 'Receipt number could not be verified'
          setAdvanceReceiptValidationError(message)
          setToast({ type: 'error', msg: message })
          return
        }
      }

      setStep(s => s + 1)
    } finally {
      setCheckingNext(false)
    }
  }

  return (
    <div className="page fade-in">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(1.3rem, 4vw, 2rem)' }}>{isStudent ? 'Student' : 'Faculty & Staff'} Registration</h1>
      </div>

      {step <= (isStudent ? 9 : 5) && (
        <div className="stepper" style={{ flexWrap: 'wrap' }}>
          {stepLabels.slice(0, -1).map((label, i) => (
            <div key={i} className={`step ${step === i + 1 ? 'active' : step > i + 1 ? 'completed' : ''}`}>
              <span className="step-num">{step > i + 1 ? '✓' : i + 1}</span>
              <span className="step-label-text">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Fallback if step is out of range */}
      {(step < 1 || step > (isStudent ? 9 : 6)) && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-rose)' }}>
          
        </div>
      )}

      {/* ===== STUDENT STEP 1: Year Selection ===== */}
      {isStudent && step === 1 && (
        <div className="reg-form slide-up">
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="section-title" style={{ justifyContent: 'center' }}>🎓 Select Your Year Category</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Choose your year of study for AY 2026–27
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', margin: '0 auto' }}>
              {[
                { val: 'phase_i', label: 'Phase I Allocation', icon: '📚', desc: '2nd to 5th Year (Kindly PAY the advance of Rs. 5000 BEFORE CLICKING on this link)' },
                {
                  val: 'phase_ii',
                  label: 'Phase II Allocation',
                  icon: '🆕',
                  desc: '1st Year (Fresh Admission) and 2nd Year – Lateral Entry'
                }
              ].map(opt => (
                <div key={opt.val}
                  onClick={() => {
                    if (opt.val === 'phase_ii') return
                    setYearCategory(opt.val)
                  }}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: opt.val === 'phase_ii' ? '2px solid rgba(59, 130, 246, 0.35)' : yearCategory === opt.val ? '2px solid var(--accent-blue)' : '2px solid var(--border-glass)',
                    background: opt.val === 'phase_ii' ? 'rgba(148, 163, 184, 0.08)' : yearCategory === opt.val ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-secondary)',
                    cursor: opt.val === 'phase_ii' ? 'not-allowed' : 'pointer',
                    opacity: opt.val === 'phase_ii' ? 0.6 : 1,
                    transition: 'var(--transition)',
                    textAlign: 'left'
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{opt.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1rem' }}>{opt.label}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                      {opt.val === 'phase_ii' && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', marginTop: '0.25rem' }}>Temporarily disabled</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== STUDENT STEP 2: Roll Number Verification ===== */}
      {isStudent && step === 2 && (
        <div className="reg-form slide-up">
          <div className="card" style={{ padding: '2rem' }}>
            <div className="section-title">🔢 Enter Your Register Number</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Enter your 12-digit register number. 
            </p>
            <div className="form-group">
              <label>Register Number *</label>
                <input
                className="form-control"
                name="registerNumber"
                value={form.registerNumber}
                onChange={handleChange}
                  placeholder="e.g. 7155XXXXXXXX or 7158XXXXXXXX"
                maxLength={12}
                style={{ fontSize: '1.1rem', letterSpacing: '1px' }}
              />
              {form.registerNumber.length > 0 && (() => {
                const validation = validateRegisterNumber(form.registerNumber)
                if (!validation.valid) {
                  return (
                    <small style={{ color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>
                      Register Number must be 12 digits and start with 7155 or 7158. Year code (positions 5-6) must be one of 22, 23, 24, 25.
                    </small>
                  )
                }
                return null
              })()}
            </div>
            {form.registerNumber.length === 12 && !rollNumberVerified && (
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={verifyingRoll}
                onClick={async () => {
                  const validation = validateRegisterNumber(form.registerNumber)
                  if (!validation.valid) {
                    setToast({ type: 'error', msg: validation.error })
                    return
                  }
                  setForm(prev => ({ ...prev, academicYear: validation.academicYear }))
                  setVerifyingRoll(true)
                  try {
                    const res = await axios.get(`/api/register/check-advance/${form.registerNumber}`)
                    if (res.data.alreadyRegistered) {
                      setToast({ type: 'error', msg: '❌ You have already registered. Cannot register again.' })
                      setTimeout(() => navigate('/'), 3000)
                    } else if (res.data.governmentSponsored) {
                      setGovernmentSponsored(true)
                      setRollNumberVerified(true)
                      setToast({ type: 'success', msg: '✅ Government Sponsored — no advance payment required' })
                    } else if (res.data.advancePaid) {
                      setRollNumberVerified(true)
                      setToast({ type: 'success', msg: '✅ Advance payment verified!' })
                    } else {
                      setToast({ type: 'error', msg: '❌ Advance payment not found. Please pay ₹5,000 at the office first.' })
                      setTimeout(() => navigate('/'), 3000)
                    }
                  } catch {
                    setToast({ type: 'error', msg: '❌ Roll number not found. Please pay the advance at the office first.' })
                    setTimeout(() => navigate('/'), 3000)
                  } finally {
                    setVerifyingRoll(false)
                  }
                }}>
                {verifyingRoll ? 'Verifying...' : '🔍 Verify Roll Number'}
              </button>
            )}
            {rollNumberVerified && (
              <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(5,150,105,0.12)', borderRadius: 'var(--radius-sm)', marginTop: '1rem', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>✅ Advance payment verified for {form.registerNumber}</span>
              </div>
            )}
            {rollNumberVerified && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(s => s + 1)}>
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== STUDENT STEP 3 / EMPLOYEE STEP 1: Guidelines ===== */}
      {((isStudent && step === 3) || (!isStudent && step === 1)) && (
        <div>
          <GuidelinesStep accepted={guidelinesAccepted} setAccepted={setGuidelinesAccepted} />
        </div>
      )}

      {/* ===== STUDENT STEP 4 / EMPLOYEE STEP 2: Instructions ===== */}
      {((isStudent && step === 4) || (!isStudent && step === 2)) && (
        <InstructionsStep accepted={instructionsAccepted} setAccepted={setInstructionsAccepted} />
      )}

      {/* Details: Student step 5, Employee step 3 */}
      {((isStudent && step === 5) || (!isStudent && step === 3)) && (
        <div className="reg-form slide-up">
          <div className="card">
            <div className="section-title">📝 Personal & Academic Information</div>
            {isEmployee && (
              <div className="form-group">
                <label>Employee Type *</label>
                <select className="form-control" name="employeeType" value={form.employeeType} onChange={handleChange}>
                  <option value="faculty">Faculty</option>
                  <option value="staff">Staff</option>                </select>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>{isStudent ? 'Register Number' : 'Employee ID *'}</label>
                <input 
                  className="form-control" 
                  name={isStudent ? 'registerNumber' : 'employeeId'}
                  value={isStudent ? form.registerNumber : form.employeeId} 
                  onChange={handleChange}
                  placeholder={isStudent ? 'e.g. 7155XXXXXXXX or 7158XXXXXXXX' : 'e.g. I1234 or A1234'}
                  maxLength={isStudent ? 12 : undefined}
                  inputMode={isEmployee ? 'text' : undefined}
                  autoCapitalize="off"
                  readOnly={isStudent}
                  style={isStudent ? { background: 'var(--bg-secondary)', cursor: 'not-allowed' } : {}}
                />
                {isEmployee && isFaculty && form.employeeId && !isValidEmployeeId(form.employeeId) && (
                  <small style={{ color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>
                    ❌ Faculty ID must start with 'I' or 'A' followed by 4 digits (e.g. I1234 or A5678)
                  </small>
                )}
                {isStudent && form.registerNumber.length > 0 && form.registerNumber.length < 12 && (
                  <small style={{ color: 'var(--accent-amber)', marginTop: '0.25rem', display: 'block' }}>
                    12 digits required, starting with 7155 or 7158
                  </small>
                )}
              </div>
              {isEmployee && (
                <div className="form-group">
                  <label>Designation *</label>
                  <select
                    className="form-control"
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    style={form.designation && !DESIGNATIONS.includes(form.designation) ? { borderColor: 'var(--accent-rose)' } : {}}
                  >
                    <option value="">Select Designation</option>
                    {(form.employeeType === 'faculty' ? FACULTY_DESIGNATIONS : STAFF_DESIGNATIONS).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {form.designation && !(form.employeeType === 'faculty' ? FACULTY_DESIGNATIONS.includes(form.designation) : STAFF_DESIGNATIONS.includes(form.designation)) && (
                    <small style={{ color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>
                      ❌ Please select a designation from the list
                    </small>
                  )}
                  {form.designation && (form.employeeType === 'faculty' ? FACULTY_DESIGNATIONS.includes(form.designation) : STAFF_DESIGNATIONS.includes(form.designation)) && (
                    <small style={{ color: 'var(--accent-emerald)', marginTop: '0.25rem', display: 'block' }}>
                      ✓ Designation verified
                    </small>
                  )}
                </div>
              )}
              
              <div className="form-group">
                <label>Full Name *</label>
                <input className="form-control" name="name" value={form.name} onChange={handleChange} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth *</label>
                <input className="form-control" type="date" name="dateOfBirth"
                  value={form.dateOfBirth} onChange={handleChange} />
              </div>
              {isStudent && (
                <div className="form-group">
                  <label>Gender *</label>
                  <select className="form-control" name="gender" value={form.gender} onChange={handleChange}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                              </select>
              </div>
              )}

              {isStudent && form.registerNumber.length > 0 && (
                <div className="form-group">
                  <label>Academic Year *</label>
                  <input
                    className="form-control"
                    value={form.academicYear ? `${form.academicYear}${form.academicYear === '1' ? 'st' : form.academicYear === '2' ? 'nd' : form.academicYear === '3' ? 'rd' : 'th'} Year (for upcoming AY 2026-27)` : 'Auto-populated from Register Number'}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                    style={{
                      background: 'var(--bg-secondary)',
                      cursor: 'not-allowed',
                      color: form.academicYear ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}
                  />
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Institution *</label>
                <select className="form-control" name="institution" value={form.institution} onChange={handleChange}>
                  <option value="PSG iTech">PSG iTech</option>
                  <option value="PSG IAP">PSG IAP</option>
                </select>
              </div>
              <div className="form-group">
                <label>Department *</label>
                <select className="form-control" name="department" value={form.department} onChange={handleChange}>
                  <option value="">Select Department</option>
                  {visibleDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              
            </div>
            <div className="form-group">
              <label>Address *</label>
              <textarea className="form-control" name="address" value={form.address} onChange={handleChange} rows={2} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Pincode *</label>
                <input
                  className="form-control"
                  name="pincode"
                  value={form.pincode}
                  onChange={e => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  inputMode="numeric"
                  maxLength={6}
                  minLength={6}
                />
                {form.pincode && !isValidPincode(form.pincode) && (
                  <small style={{ color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>
                    ❌ Pincode must be exactly 6 digits
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input 
                  className="form-control" 
                  type="email" 
                  name="mailId" 
                  value={form.mailId} 
                  onChange={handleChange}
                  style={form.mailId && !form.mailId.endsWith(form.institution === 'PSG IAP' ? '@psgiap.ac.in' : '@psgitech.ac.in') ? { borderColor: 'var(--accent-rose)' } : {}}
                />
                {form.mailId && !form.mailId.endsWith(form.institution === 'PSG IAP' ? '@psgiap.ac.in' : '@psgitech.ac.in') && (
                  <small style={{ color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>
                    ❌ Email must be from {form.institution === 'PSG IAP' ? 'psgiap.ac.in' : 'psgitech.ac.in'} domain
                  </small>
                )}
                {form.mailId && form.mailId.endsWith(form.institution === 'PSG IAP' ? '@psgiap.ac.in' : '@psgitech.ac.in') && (
                  <small style={{ color: 'var(--accent-emerald)', marginTop: '0.25rem', display: 'block' }}>
                    ✓ Email domain verified
                  </small>
                )}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  className="form-control"
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={e => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  inputMode="numeric"
                  maxLength={10}
                  minLength={10}
                />
                {form.phoneNumber && !isValidPhone(form.phoneNumber) && (
                  <small style={{ color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>
                    ❌ Phone number must be 10 digits
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Emergency Phone *</label>
                <input
                  className="form-control"
                  name="emergencyPhoneNumber"
                  value={form.emergencyPhoneNumber}
                  onChange={e => setForm({ ...form, emergencyPhoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  inputMode="numeric"
                  maxLength={10}
                  minLength={10}
                />
                {form.emergencyPhoneNumber && !isValidPhone(form.emergencyPhoneNumber) && (
                  <small style={{ color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>
                    ❌ Emergency phone must be 10 digits
                  </small>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boarding: Student step 6, Employee step 4 */}
      {((isStudent && step === 6) || (!isStudent && step === 4)) && (
        <div className="reg-form slide-up">
          <div className="card">
            <div className="section-title">🚌 Select Your Boarding Point</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Choose the boarding point <strong>farthest from college</strong> on your route.
            </p>
            
            {/* Tentative Routes Information */}
            <div style={{ background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)', border: '1px solid rgba(102, 126, 234, 0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>📄</span>
                <strong style={{ color: 'var(--accent-blue)' }}>Tentative Routes</strong>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, marginBottom: '0.75rem' }}>
                View the complete route schedule and bus stop information from the attached PDF
              </p>
              <a href="https://drive.google.com/file/d/1MuxGySxOVv7roChzpDlq5J60P10TcO03/view?usp=sharing" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '0.5rem 1rem', backgroundColor: 'var(--accent-blue)', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                📄 View Routes PDF
              </a>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: '1.5rem' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="🔍 Search bus stops..." 
                value={searchStop}
                onChange={(e) => setSearchStop(e.target.value)}
                style={{ marginBottom: '1rem' }}
              />
            </div>

            {/* Scrollable Bus Stops Container */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.75rem',
              maxHeight: '400px',
              overflowY: 'auto',
              padding: '0.5rem',
              border: '1px solid var(--bg-secondary)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-glass)'
            }}>
              {routesLoadError && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--accent-rose)' }}>
                  {routesLoadError}
                </div>
              )}
              {filteredBoardingPoints.map(stop => (
                <div 
                  key={stop.name}
                  className={`route-option ${selectedStop?.name === stop.name ? 'selected' : ''}`}
                  onClick={() => selectStop(stop, stop.routeId)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: selectedStop?.name === stop.name ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                    color: selectedStop?.name === stop.name ? 'white' : 'var(--text-primary)',
                    transition: 'all 0.2s ease',
                    border: selectedStop?.name === stop.name ? '2px solid var(--accent-blue)' : '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedStop?.name !== stop.name) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedStop?.name !== stop.name) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }
                  }}
                >
                  <span style={{ flex: 1, fontWeight: 500 }}>{stop.name}</span>
                  <span style={{ 
                    textAlign: 'right', 
                    display: 'flex', 
                    gap: '1rem',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: 600, minWidth: '80px' }}>₹ {stop.fees}</span>
                    <span style={{ fontWeight: 600, minWidth: '60px' }}>{stop.time}</span>
                  </span>
                </div>
              ))}
              {filteredBoardingPoints.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No boarding points found matching "{searchStop}"
                </div>
              )}
            </div>

            {/* Selected Stop Summary */}
            {selectedStop && (
              <div style={{ 
                marginTop: '1.5rem', 
                padding: '1rem', 
                backgroundColor: 'var(--bg-glass)',
                border: '2px solid var(--accent-emerald)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  ✓ Selected Boarding Point
                </div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--accent-emerald)' }}>
                  {selectedStop.name} — {selectedStop.time}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Annual Fee: ₹ {getFinalFee().toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Student Step 7: Advance Payment */}
      {isStudent && step === 7 && (
        <div className="reg-form slide-up">
          <div className="card">
            <div className="section-title">Advance Payment</div>
            {governmentSponsored ? (
              <div style={{ padding: '1.25rem', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(5,150,105,0.12)', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>Government Sponsored Scholarship</div>
                <div style={{ color: 'var(--text-muted)' }}>You are exempt from the ₹5,000 advance payment and need not upload any receipt.</div>
              </div>
            ) : (
              <div style={{
                background: 'linear-gradient(135deg, #3b82f615 0%, #1e40af30 100%)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Enter the advance payment receipt details.
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Receipt Number from Office {governmentSponsored ? '' : '*'}</label>
              <input
                className="form-control"
                placeholder="e.g., 0018"
                value={advanceReceiptNumber}
                onChange={(e) => {
                  setAdvanceReceiptNumber(e.target.value)
                  if (advanceReceiptValidationError) setAdvanceReceiptValidationError('')
                }}
                disabled={governmentSponsored}
              />
              {advanceReceiptValidationError && !governmentSponsored && (
                <small style={{ color: 'var(--accent-rose)', marginTop: '0.35rem', display: 'block', fontWeight: 600 }}>
                  {advanceReceiptValidationError}
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Upload Receipt PDF {governmentSponsored ? '' : '*'}</label>
              {governmentSponsored ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No receipt required for government sponsored students.</div>
              ) : (
                <div style={{
                  border: '2px dashed var(--accent-blue)',
                  borderRadius: '8px',
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-glass)'
                }}>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const file = e.target.files[0]
                        const fileBaseName = file.name.replace(/\.pdf$/i, '')
                        if (fileBaseName !== form.registerNumber.trim()) {
                          setToast({ type: 'error', msg: `PDF filename must be exactly: ${form.registerNumber}.pdf` })
                          return
                        }
                        if (file.type === 'application/pdf') {
                          setAdvanceReceiptFile(file)
                        } else {
                          setToast({ type: 'error', msg: 'Please select a PDF file' })
                        }
                      }
                    }}
                    style={{ display: 'none' }}
                    id="advance-pdf-upload"
                  />
                  <label htmlFor="advance-pdf-upload" style={{ cursor: 'pointer', display: 'block' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      {advanceReceiptFile ? '✓ ' + advanceReceiptFile.name : 'Click to upload or drag & drop'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Filename must be: {form.registerNumber}.pdf
                    </div>
                  </label>
                </div>
              )}
            </div>

            {(!governmentSponsored && advanceReceiptFile && advanceReceiptNumber) && !advanceReceiptValidationError && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-glass)', border: '2px solid var(--accent-emerald)', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 600 }}>Receipt #:</span>
                  <span>{advanceReceiptNumber}</span>
                  <span style={{ fontWeight: 600 }}>Advance Paid:</span>
                  <span>₹ {getAdvanceAmount().toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Final Fee Receipt Upload - Removed from registration, moved to dashboard */}

      {/* Review: Student step 8, Employee step 5 */}
      {(isStudent ? step === 8 : step === 5) && (
        <div className="reg-form slide-up">
          <div className="card">
            <div className="section-title">✅ Review Your Registration</div>
            <table style={{ width: '100%' }}>
              <tbody>
                {[
                  ['Type', userType.charAt(0).toUpperCase() + userType.slice(1)],
                  [isStudent ? 'Register No.' : 'Employee ID', isStudent ? form.registerNumber : form.employeeId],
                  ['Name', form.name],
                  ['DOB', form.dateOfBirth],
                  isStudent ? ['Year', `${form.academicYear}${['st','nd','rd','th','th'][form.academicYear-1]} Year`] : null,
                  isStudent ? ['Gender', form.gender] : null,
                  isEmployee ? ['Designation', form.designation] : null,
                  ['Department', form.department],
                  ['Institution', form.institution],
                  ['Address', form.address],
                  ['Pincode', form.pincode],
                  ['Phone', form.phoneNumber],
                  ['Emergency Phone', form.emergencyPhoneNumber],
                  ['Email', form.mailId],
                  ['Boarding Point', selectedStop?.name],
                  ['Route', routes.find(r => r.routeId === selectedRoute)?.routeNumber],
                  ['Total Amount', `₹ ${getFinalFee().toLocaleString()}`],
                  ['Advance Paid', `₹ ${getAdvanceAmount().toLocaleString()}`],
                  ['Payable Amount', `₹ ${getPayableAmount().toLocaleString()}`],
                  isStudent && governmentSponsored ? ['Scholarship', 'Government Sponsored Scholarship'] : (isStudent ? ['Advance Receipt #', advanceReceiptNumber || 'N/A'] : null),
                ].filter(Boolean).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)', width: '35%', fontSize: '0.85rem' }}>{k}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 500, fontSize: '0.9rem' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Success: Student step 10, Employee step 6 */}
      {(isStudent ? step === 10 : step === 6) && result && (
        <div className="reg-form slide-up" style={{ textAlign: 'center' }}>
          <div className="card" style={{ padding: '3rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Registration Successful!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{result.message}</p>
            <div style={{ background: 'var(--bg-glass)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'inline-block' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{isStudent ? 'Registration ID' : 'Staff ID'}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' }}>{isStudent ? result.registrationId : result.employeeId}</div>
            </div>
            {result.phase && (
              <p style={{ color: 'var(--accent-amber)', fontSize: '0.9rem' }}>Phase {result.phase} allocation</p>
            )}
            <p style={{ color: 'var(--accent-emerald)', fontWeight: 600, marginTop: '1rem' }}>
              Annual Fee: ₹ {result.finalFees?.toLocaleString()}
            </p>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => navigate('/')}>Back to Home</button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      {(isStudent ? step <= 8 : step <= 5) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem', paddingBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {step > 1 && !(isStudent && step === 2) && <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>← Back</button>}
            {(isStudent ? step < 8 && step !== 2 : step < 5) && (
              <button className="btn btn-primary" disabled={!canNext() || checkingNext} onClick={handleNext}>
                {checkingNext ? 'Checking...' : 'Next →'}
              </button>
            )}
            {(isStudent ? step === 8 : step === 5) && !otpSent && (
              <button className="btn btn-primary btn-lg" disabled={submitting} onClick={handleSendOtp}>
                {submitting ? 'Sending...' : 'Send OTP to Email'}
              </button>
            )}
          </div>
          
          {(isStudent ? step === 8 : step === 5) && otpSent && (
            <div style={{ background: 'var(--bg-glass)', padding: '1.5rem', borderRadius: '12px', width: '100%', maxWidth: '420px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Enter the OTP sent to {form.mailId}</p>
              <input 
                className="form-control" 
                placeholder="Enter OTP" 
                value={otp} 
                onChange={e => setOtp(e.target.value)} 
                 style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px', marginBottom: '1rem', color: '#000000' }}
                 className="form-control"
              />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'stretch' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', color: 'black', fontWeight: 600 }} 
                  disabled={verifyingOtp || otp.length < 6}
                  onClick={handleSubmit}
                >
                  {verifyingOtp ? 'Verifying...' : '✓ Verify & Submit'}
                </button>
                
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', color: 'black', fontWeight: 600 }}
                  disabled={submitting}
                  onClick={handleResendOtp}
                >
                  {submitting ? 'Resending...' : '🔄 Resend OTP'}
                </button>
              </div>

              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                {!otp || otp.length < 6 ? (
                  <small style={{ color: 'var(--accent-rose)', display: 'block' }}>Enter the full 6-digit OTP to enable verification.</small>
                ) : (
                  <small style={{ color: 'var(--accent-emerald)', display: 'block' }}>Ready to verify.</small>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
