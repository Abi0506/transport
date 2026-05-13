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
  'B.E. Robotics and Artificial Intelligence',
  // B.Tech Programs
  'B.Tech. Artificial Intelligence and Data Science',
  'B.Tech. Electronics Engineering (VLSI Design and Technology)',
  // M.E Programs
  'M.E. Structural Engineering',
  'M.E. Engineering Design',
  'M.E. Computer Science and Engineering',
  // B.Des
  'B.Des. Bachelor of Design'
]

export default function Registration() {
  const { userType } = useParams()
  const navigate = useNavigate()
  
  // Initialize step with session persistence
  const [step, setStep] = useState(() => {
    const savedStep = sessionStorage.getItem(`registration-step-${userType}`)
    return savedStep ? parseInt(savedStep) : 1
  })
  
  const [routes, setRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState('')
  const [selectedStop, setSelectedStop] = useState(null)
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false)
  const [instructionsAccepted, setInstructionsAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [toast, setToast] = useState(null)

  const [form, setForm] = useState({
    name: '', dateOfBirth: '', address: '', pincode: '',
    phoneNumber: '', emergencyPhoneNumber: '', mailId: '',
    department: '', institution: 'PSG iTech', boardingPoint: '',
    registerNumber: '', gender: 'Male', academicYear: '2',
    employeeId: '', category: '', designation: '', employeeType: 'faculty'
  })
  const isStudent = userType === 'student'
  const isEmployee = userType === 'employee'
  const isFaculty = isEmployee && form.employeeType === 'faculty'
  const isStaff = isEmployee && form.employeeType === 'staff'
  const concession = isFaculty ? 50 : isStaff ? 25 : 0
  useEffect(() => {
    axios.get('/api/register/boarding-points')
      .then(res => setRoutes(res.data))
      .catch(() => {})
  }, [])

  // Save step to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem(`registration-step-${userType}`, step.toString())
  }, [step, userType])

  // Function to validate and extract academic year from register number
  const validateRegisterNumber = (regNum) => {
    // Must be 12 digits, start with 7155
    if (!/^\d{12}$/.test(regNum) || !regNum.startsWith('7155')) {
      return { valid: false, academicYear: null, error: 'Register Number must be 12 digits starting with 7155' }
    }
    
    // Extract year code (digits 5-6, after 7155)
    const yearCode = regNum.substring(4, 6)
    const yearMap = { '23': '4', '22': '5', '24': '3', '25': '2' }
    
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
          setToast({ type: 'success', msg: `Year ${validation.academicYear} auto-selected` })
        } else {
          setToast({ type: 'error', msg: validation.error })
        }
      } else {
        setForm({ ...form, registerNumber: regNum })
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

  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)

  const stepLabels = ['Guidelines', 'Instructions', 'Details', 'Boarding Point', 'Review']

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
      
      const payload = {
        ...form,
        boardingPoint: selectedStop?.name,
        guidelinesAccepted,
        instructionsAccepted
      }
      const endpoint = `/api/register/${isEmployee ? form.employeeType : userType}`
      const res = await axios.post(endpoint, payload)
      setResult(res.data)
      setStep(6)
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Verification or Registration failed' })
    } finally {
      setVerifyingOtp(false)
    }
  }

  const canNext = () => {
    if (step === 1) return guidelinesAccepted
    if (step === 2) return instructionsAccepted
    if (step === 3) {
      const base = form.name && form.dateOfBirth && form.address && form.pincode &&
        form.phoneNumber && form.emergencyPhoneNumber && form.mailId && form.department
      if (isStudent) {
        // Validate register number format
        if (form.registerNumber.length !== 12 || !form.registerNumber.startsWith('7155')) {
          return false
        }
        // Validate email domain for students
        if (!form.mailId.endsWith('@psgitech.ac.in')) {
          return false
        }
        const validation = validateRegisterNumber(form.registerNumber)
        return base && validation.valid && form.gender && form.academicYear
      }
      return base && form.employeeId
    }
    if (step === 4) return selectedStop !== null
    return true
  }  // Debug: log the step value
  useEffect(() => {
    console.log('Registration page loaded. Step:', step, 'UserType:', userType, 'isStudent:', isStudent)
  }, [step, userType, isStudent])

  return (
    <div className="page fade-in">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1>{isStudent ? '🎓 Student' : '👨‍🏫 Faculty / Staff'} Registration</h1>
        <p>
          {isStudent ? ' ' :
            ' '}
        </p>
      </div>

      {/* Advance Payment Notice - Only for Students */}
      {isStudent && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: '3px solid #764ba2',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          color: 'white',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',          animation: 'slideDown 0.5s ease-out',
          maxWidth: '750px',
          margin: '0 auto 2rem auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ fontSize: '3.5rem', flexShrink: 0 }}>💰</div>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.6rem', fontWeight: '700' }}>
                Advance Payment: ₹5,000
              </h3>
              <p style={{ margin: '0.3rem 0', fontSize: '1rem', opacity: '0.95' }}>
                ✓ Fully refundable if seat not allocated • 📱 Upload receipt or visit office
              </p>
            </div>
          </div>
        </div>      )}      {/* DEBUG: Show step value */}
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
        Current Step: {step} | User Type: {userType} | Is Student: {isStudent ? 'Yes' : 'No'}
      </div>

      {step <= 5 && (
        <div className="stepper">
          {stepLabels.map((label, i) => (
            <div key={i} className={`step ${step === i + 1 ? 'active' : step > i + 1 ? 'completed' : ''}`}>
              <span className="step-num">{step > i + 1 ? '✓' : i + 1}</span>
              {label}
            </div>
          ))}
        </div>
      )}      {step === 1 && (
        <div>
          <GuidelinesStep accepted={guidelinesAccepted} setAccepted={setGuidelinesAccepted} />
        </div>
      )}

      {/* Fallback if step is out of range */}
      {(step < 1 || step > 6) && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-rose)' }}>
          Error: Invalid step value {step}. Please refresh the page.
        </div>
      )}

      {/* Step 2: Instructions */}
      {step === 2 && (
        <InstructionsStep accepted={instructionsAccepted} setAccepted={setInstructionsAccepted} />
      )}

      {/* Step 3: Personal & Academic Details */}
      {step === 3 && (
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
                <label>{isStudent ? 'Register Number *' : 'Employee ID *'}</label>
                <input 
                  className="form-control" 
                  name={isStudent ? 'registerNumber' : 'employeeId'}
                  value={isStudent ? form.registerNumber : form.employeeId} 
                  onChange={handleChange}
                  placeholder={isStudent ? 'e.g. 715523IT001' : 'e.g. EMP1234'}
                  maxLength={isStudent ? 12 : undefined}
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

              {isStudent && (
                <div className="form-group">
                  <label>Academic Year *</label>
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontWeight: '500',
                    color: form.academicYear ? 'var(--text-primary)' : 'var(--text-muted)'
                  }}>
                    {form.academicYear ? `${form.academicYear}${form.academicYear === '1' ? 'st' : form.academicYear === '2' ? 'nd' : form.academicYear === '3' ? 'rd' : 'th'} Year (for upcoming AY 2026-27)` : 'Auto-populated from Register Number'}
                  </div>
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

      {/* Step 4: Boarding Point */}
      {step === 4 && (
        <div className="reg-form slide-up">
          <div className="card">
            <div className="section-title">🚌 Select Your Boarding Point</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Choose the boarding point <strong>farthest from college</strong> on your route.
            </p>
            {routes.map(route => (
              <div key={route.routeId} style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', marginBottom: '0.5rem' }}>
                  {route.routeNumber} — {route.routeName} (Capacity: {route.capacity})
                </h4>
                <div className="route-select-grid">
                  {route.stops.map(stop => (
                    <div key={stop.name}
                      className={`route-option ${selectedStop?.name === stop.name ? 'selected' : ''}`}
                      onClick={() => selectStop(stop, route.routeId)}>
                      <div>
                        <div className="stop-name">{stop.name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="stop-meta" style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>
                          ⏰ {stop.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Review */}
      {step === 5 && (
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
                  ['Annual Fee', `₹${getFinalFee().toLocaleString()}`]
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

      {/* Step 6: Success */}
      {step === 6 && result && (
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
              <button className="btn btn-primary" onClick={() => navigate('/payment')}>Upload Payment Receipt →</button>
              <button className="btn btn-secondary" onClick={() => navigate('/')}>Back to Home</button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      {step <= 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem', paddingBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {step > 1 && <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>← Back</button>}
            {step < 5 && (
              <button className="btn btn-primary" disabled={!canNext()} onClick={() => setStep(s => s + 1)}>
                Next →
              </button>
            )}
            {step === 5 && !otpSent && (
              <button className="btn btn-primary btn-lg" disabled={submitting} onClick={handleSendOtp}>
                {submitting ? 'Sending...' : 'Send OTP to Email'}
              </button>
            )}
          </div>
          
          {step === 5 && otpSent && (
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
