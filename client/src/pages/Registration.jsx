import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import GuidelinesStep from '../components/GuidelinesStep'
import InstructionsStep from '../components/InstructionsStep'

const DEPARTMENTS = [
  // B.E Programs
  'B.E. Civil Engineering',
  'B.E. Computer Science and Engineering',
  'B.E. Electrical and Electronics Engineering',
  'B.E. Electronics and Communication Engineering',
  'B.E. Instrumentation and Control Engineering',
  'B.E. Mechanical Engineering',

  // B.Tech Programs
  'B.Tech. Artificial Intelligence and Data Science',
  'B.Tech. Electronics Engineering (VLSI Design and Technology)',

  // M.E Programs
  'M.E. Structural Engineering',
  'M.E. Engineering Design',

  // B.Arch
  'B.Arch. Bachelor of Architecture'
]

export default function Registration() {
  const { userType } = useParams()
  const navigate = useNavigate()
  const storageKey = `registration-draft-${userType}`
  
  // Initialize step with session persistence
  const [step, setStep] = useState(() => {
    const savedStep = sessionStorage.getItem(`registration-step-${userType}`)
    return savedStep ? parseInt(savedStep) : 1
  })
  
  const [routes, setRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState('')
  const [selectedStop, setSelectedStop] = useState(null)
  const [searchStop, setSearchStop] = useState('')
  const [advanceReceiptFile, setAdvanceReceiptFile] = useState(null)
  const [advanceReceiptNumber, setAdvanceReceiptNumber] = useState('')
  const [advancePaymentDate, setAdvancePaymentDate] = useState('')
  const [advanceDecision, setAdvanceDecision] = useState('')
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
  const concession = isFaculty ? 50 : isStaff ? 25 : 0

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
    axios.get('/api/register/boarding-points')
      .then(res => setRoutes(res.data))
      .catch(() => {})
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
    // Must be 12 digits, start with 7155
    if (!/^\d{12}$/.test(regNum) || !regNum.startsWith('7155')) {
      return { valid: false, academicYear: null, error: 'Register Number must be 12 digits starting with 7155' }
    }
    
    // Extract year code (digits 5-6, after 7155)
    const yearCode = regNum.substring(4, 6)
    const yearMap = { '23': '4', '22': '5', '24': '3', '25': '2', '26': '1' }
    
    if (!yearMap[yearCode]) {
      return { valid: false, academicYear: null, error: `Invalid year code '${yearCode}'. Only 22, 23, 24, 25 are allowed` }
    }
    
    return { valid: true, academicYear: yearMap[yearCode], error: null }
  }
  const handleChange = (e) => {
    if (e.target.name === 'registerNumber' && isStudent) {
      const regNum = e.target.value
      
      // Allow only digits
      if (!/^\d*$/.test(regNum)) {
        return
      }
      
      // Auto-validate and populate academic year
      if (regNum.length === 12) {
        const validation = validateRegisterNumber(regNum)
        if (validation.valid) {
          setForm({ 
            ...form, 
            registerNumber: regNum, 
            academicYear: validation.academicYear 
          })
        } else {
          setToast({ type: 'error', msg: validation.error })
        }
      } else {
        setForm({ ...form, registerNumber: regNum })
            // Reset verification when user changes roll number
            if (regNum !== form.registerNumber) {
              setRollNumberVerified(false)
            }
      }    } else if (e.target.name === 'mailId' && isStudent) {
      const email = e.target.value
      setForm({ ...form, mailId: email })
      // Email validation is done inline below the input field, no toast needed
    } else {
      setForm({ ...form, [e.target.name]: e.target.value })
    }
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

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const stepLabels = isStudent 
    ? ['Year Selection', 'Roll Number', 'Guidelines', 'Instructions', 'Details', 'Boarding Point', 'Advance Payment', 'Final Fee', 'Review', 'Success']
    : ['Guidelines', 'Instructions', 'Details', 'Boarding Point', 'Review', 'Success']

  const handleSendOtp = async () => {
    setSubmitting(true)
    try {
      await axios.post('/api/otp/send', { email: form.mailId })
      setOtpSent(true)
      setToast({ type: 'success', msg: 'OTP sent to ' + form.mailId })
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Failed to send OTP' })
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
        boardingPoint: selectedStop?.name,
        guidelinesAccepted,
        instructionsAccepted,
        advancePaymentDecision: isStudent ? advanceDecision : null,
        advanceReceiptNumber: isStudent ? advanceReceiptNumber : null,
        advancePaymentDate: isStudent ? advancePaymentDate : null,
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
      setAdvancePaymentDate('')
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
    if (isStudent) {
      if (step === 1) return !!yearCategory
      if (step === 2) return rollNumberVerified
      if (step === 3) return guidelinesAccepted
      if (step === 4) return instructionsAccepted
      if (step === 5) {
        const base = form.name && form.dateOfBirth && form.address && form.pincode &&
          form.phoneNumber && form.emergencyPhoneNumber && form.mailId && form.department
        if (form.registerNumber.length !== 12 || !form.registerNumber.startsWith('7155')) return false
        if (!form.mailId.endsWith('@psgitech.ac.in')) return false
        const validation = validateRegisterNumber(form.registerNumber)
        return base && validation.valid && form.gender && form.academicYear
      }
      if (step === 6) return selectedStop !== null
      if (step === 7) return advanceDecision === 'yes' && advanceReceiptFile && advanceReceiptNumber && advancePaymentDate
      if (step === 8) return finalReceiptFile && finalReceiptNumber && finalPaymentDate
      if (step === 9) return true
      return true
    } else {
      if (step === 1) return guidelinesAccepted
      if (step === 2) return instructionsAccepted
      if (step === 3) {
        const base = form.name && form.dateOfBirth && form.address && form.pincode &&
          form.phoneNumber && form.emergencyPhoneNumber && form.mailId && form.department
        return base && form.employeeId
      }
      if (step === 4) return selectedStop !== null
      if (step === 5) return true
      return true
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
          Error: Invalid step. Please refresh the page.
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
                { val: 'phase_i', label: 'Phase I Allocation', icon: '📚', desc: '2nd to 5th Year' },
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
            <div className="section-title">🔢 Enter Your Roll Number</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Enter your 12-digit register number. The office must have recorded your advance payment before you can proceed.
            </p>
            <div className="form-group">
              <label>Register Number *</label>
              <input
                className="form-control"
                name="registerNumber"
                value={form.registerNumber}
                onChange={handleChange}
                placeholder="e.g. 7155XXXXXXXX"
                maxLength={12}
                style={{ fontSize: '1.1rem', letterSpacing: '1px' }}
              />
              {form.registerNumber.length > 0 && form.registerNumber.length < 12 && (
                <small style={{ color: 'var(--accent-amber)', marginTop: '0.25rem', display: 'block' }}>
                  12 digits required, starting with 7155
                </small>
              )}
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
                  placeholder={isStudent ? 'e.g. 7155XXXXXXXX' : 'e.g. AXXXX'}
                  maxLength={isStudent ? 12 : undefined}
                  readOnly={isStudent}
                  style={isStudent ? { background: 'var(--bg-secondary)', cursor: 'not-allowed' } : {}}
                />
                {isStudent && form.registerNumber.length > 0 && form.registerNumber.length < 12 && (
                  <small style={{ color: 'var(--accent-amber)', marginTop: '0.25rem', display: 'block' }}>
                    12 digits required, starting with 7155
                  </small>
                )}
              </div>
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
                <label>Department *</label>
                <select className="form-control" name="department" value={form.department} onChange={handleChange}>
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Institution *</label>
                <select className="form-control" name="institution" value={form.institution} onChange={handleChange}>
                  <option value="PSG iTech">PSG iTech</option>
                  <option value="PSG IAP">PSG IAP</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Address *</label>
              <textarea className="form-control" name="address" value={form.address} onChange={handleChange} rows={2} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Pincode *</label>                <input className="form-control" name="pincode" value={form.pincode} onChange={handleChange} maxLength={6} />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input 
                  className="form-control" 
                  type="email" 
                  name="mailId" 
                  value={form.mailId} 
                  onChange={handleChange}
                  style={isStudent && form.mailId && !form.mailId.endsWith('@psgitech.ac.in') ? { borderColor: 'var(--accent-rose)' } : {}}
                />
                {isStudent && form.mailId && !form.mailId.endsWith('@psgitech.ac.in') && (
                  <small style={{ color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>
                    ❌ Email must be from psgitech.ac.in domain
                  </small>
                )}
                {isStudent && form.mailId && form.mailId.endsWith('@psgitech.ac.in') && (
                  <small style={{ color: 'var(--accent-emerald)', marginTop: '0.25rem', display: 'block' }}>
                    ✓ Email domain verified
                  </small>
                )}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Phone Number *</label>
                <input className="form-control" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} maxLength={10} />
              </div>
              <div className="form-group">
                <label>Emergency Phone *</label>
                <input className="form-control" name="emergencyPhoneNumber" value={form.emergencyPhoneNumber} onChange={handleChange} maxLength={10} />
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
              {routes.flatMap(route => 
                route.stops
                  .filter(stop => stop.name.toLowerCase().includes(searchStop.toLowerCase()))
                  .map(stop => (
                  <div 
                    key={`${route.routeId}-${stop.name}`}
                    className={`route-option ${selectedStop?.name === stop.name ? 'selected' : ''}`}
                    onClick={() => selectStop(stop, route.routeId)}
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
                      <span style={{ fontWeight: 600, minWidth: '60px' }}>⏰ {stop.time}</span>
                    </span>
                  </div>
                ))
              )}
              {routes.flatMap(route => 
                route.stops.filter(stop => stop.name.toLowerCase().includes(searchStop.toLowerCase()))
              ).length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No bus stops found matching "{searchStop}"
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
                  {selectedStop.name} — ⏰ {selectedStop.time}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Annual Fee: ₹{getFinalFee().toLocaleString()}
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
            <div className="section-title">💳 Advance Payment</div>
            {!advanceDecision ? (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Have you already paid the advance amount of ₹5,000 at the office?
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => setAdvanceDecision('yes')}>
                    Yes, I have paid
                  </button>
                  <button className="btn btn-secondary" onClick={() => navigate('/')}>
                    No, take me home
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  background: 'linear-gradient(135deg, #3b82f615 0%, #1e40af30 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Enter the advance payment receipt details only if you have already paid.
                  </div>
                </div>
                <div className="form-group">
                  <label>Receipt Number from Office *</label>
                  <input className="form-control" placeholder="e.g., RCP-2026-00123" value={advanceReceiptNumber} onChange={(e) => setAdvanceReceiptNumber(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Date of Payment *</label>
                  <input className="form-control" type="date" value={advancePaymentDate} onChange={(e) => setAdvancePaymentDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="form-group">
                  <label>Upload Receipt PDF *</label>
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
                </div>
                {advanceReceiptFile && advanceReceiptNumber && advancePaymentDate && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-glass)', border: '2px solid var(--accent-emerald)', borderRadius: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 600 }}>Receipt #:</span>
                      <span>{advanceReceiptNumber}</span>
                      <span style={{ fontWeight: 600 }}>Date Paid:</span>
                      <span>{new Date(advancePaymentDate).toLocaleDateString()}</span>
                      <span style={{ fontWeight: 600 }}>Advance Paid:</span>
                      <span>₹{getAdvanceAmount().toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </>
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
                  ['Department', form.department],
                  ['Institution', form.institution],
                  ['Address', form.address],
                  ['Pincode', form.pincode],
                  ['Phone', form.phoneNumber],
                  ['Emergency Phone', form.emergencyPhoneNumber],
                  ['Email', form.mailId],
                  ['Boarding Point', selectedStop?.name],
                  ['Route', routes.find(r => r.routeId === selectedRoute)?.routeNumber + ' — ' + routes.find(r => r.routeId === selectedRoute)?.routeName],
                  ['Total Amount', `₹${getFinalFee().toLocaleString()}`],
                  ['Advance Paid', `₹${getAdvanceAmount().toLocaleString()}`],
                  ['Payable Amount', `₹${getPayableAmount().toLocaleString()}`],
                  isStudent ? ['Advance Receipt #', advanceReceiptNumber || 'N/A'] : null,
                  isStudent ? ['Advance Paid On', advancePaymentDate ? new Date(advancePaymentDate).toLocaleDateString() : 'N/A'] : null
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
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registration ID</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace' }}>{result.registrationId}</div>
            </div>
            {result.phase && (
              <p style={{ color: 'var(--accent-amber)', fontSize: '0.9rem' }}>Phase {result.phase} allocation</p>
            )}
            <p style={{ color: 'var(--accent-emerald)', fontWeight: 600, marginTop: '1rem' }}>
              Annual Fee: ₹{result.finalFees?.toLocaleString()}
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
              <button className="btn btn-primary" disabled={!canNext()} onClick={() => setStep(s => s + 1)}>
                Next →
              </button>
            )}
            {(isStudent ? step === 8 : step === 5) && !otpSent && (
              <button className="btn btn-primary btn-lg" disabled={submitting} onClick={handleSendOtp}>
                {submitting ? 'Sending...' : 'Send OTP to Email'}
              </button>
            )}
          </div>
          
          {(isStudent ? step === 8 : step === 5) && otpSent && (
            <div style={{ background: 'var(--bg-glass)', padding: '1.5rem', borderRadius: '12px', width: '100%', maxWidth: '300px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Enter the OTP sent to {form.mailId}</p>
              <input className="form-control" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px', marginBottom: '1rem' }} />
              <button className="btn btn-success btn-lg" style={{ width: '100%' }} disabled={verifyingOtp || otp.length < 4} onClick={handleSubmit}>
                {verifyingOtp ? 'Verifying...' : '✓ Verify & Submit'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
