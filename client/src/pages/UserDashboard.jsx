import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function UserDashboard() {
  const [user, setUser] = useState(null)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)

  const [cancelReason, setCancelReason] = useState('')
  const [canceling, setCanceling] = useState(false)
  const [cancelOtp, setCancelOtp] = useState('')
  const [cancelOtpSent, setCancelOtpSent] = useState(false)
  const [sendingCancelOtp, setSendingCancelOtp] = useState(false)

  const [finalFile, setFinalFile] = useState(null)
  const [uploadingFinal, setUploadingFinal] = useState(false)

  const navigate = useNavigate()

  const handleFinalUpload = async () => {
    if (!finalFile) { setToast({ type: 'error', msg: 'Please select a PDF file' }); setTimeout(() => setToast(null), 3000); return; }

    const rollNumber = user.registerNumber || user.employeeId
    const fileBaseName = finalFile.name.replace(/\.pdf$/i, '')
    if (fileBaseName !== rollNumber) {
      setToast({ type: 'error', msg: 'PDF filename must match your roll number or staff ID' })
      setTimeout(() => setToast(null), 3500)
      return
    }

    setUploadingFinal(true)
    const formData = new FormData()
    formData.append('receipt', finalFile)
    formData.append('rollNumber', rollNumber)
    formData.append('registrationId', user.registrationId || user._id)
    try {
      const res = await axios.post('/api/payment/upload-final-receipt', formData)
      setToast({ type: 'success', msg: res.data.message })
      setFinalFile(null)
      setUser(prev => prev ? { ...prev, finalReceiptFile: finalFile.name, fullFeePaid: false, finalConfirmationMethod: 'upload' } : prev)
    } catch (err) { setToast({ type: 'error', msg: err.response?.data?.message || 'Upload failed' }) }
    finally { setUploadingFinal(false); setTimeout(() => setToast(null), 4000) }
  }

  const sendCancellationOtp = async () => {
    if (!cancelReason.trim()) {
      setToast({ type: 'error', msg: 'Please enter a cancellation reason first' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    setSendingCancelOtp(true)
    try {
      await axios.post('/api/otp/send', { email: user.mailId, purpose: 'cancellation' })
      setCancelOtpSent(true)
      setToast({ type: 'success', msg: `OTP sent to ${user.mailId}` })
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Failed to send OTP' })
    } finally {
      setSendingCancelOtp(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const submitCancellation = async () => {
    if (!cancelReason.trim() || !cancelOtp.trim()) return
    setCanceling(true)
    try {
      await axios.post('/api/otp/verify', { email: user.mailId, otp: cancelOtp.trim() })
      const res = await axios.post('/api/payment/cancel-request', {
        reason: cancelReason.trim(),
        registrationId: user.registrationId || user._id
      })
      setToast({ type: 'success', msg: res.data.message })
      setCancelOtp('')
      setCancelOtpSent(false)
      setCancelReason('')
      setUser(prev => prev ? { ...prev, cancellationRequested: true, cancellationReason: cancelReason.trim() } : prev)
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Failed' })
    } finally {
      setCanceling(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const storedUser = sessionStorage.getItem('currentUser')
        if (!storedUser) return navigate('/login')
        setUser(JSON.parse(storedUser))
      } catch (err) {
        sessionStorage.removeItem('currentUser')
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [navigate])

  const logout = () => {
    sessionStorage.removeItem('currentUser')
    navigate('/')
  }

  if (loading) return <div className="page" style={{ textAlign: 'center', paddingTop: '4rem' }}><h2>Loading...</h2></div>
  if (!user) return null

  const isStudent = user.userType === 'student'
  const totalAmount = user.finalFees || 0
  const advanceAmount = isStudent ? 5000 : 0
  const payableAmount = isStudent ? Math.max(0, totalAmount - advanceAmount) : totalAmount

  const statusColor = {
    pending: 'var(--accent-amber)', allocated: 'var(--accent-emerald)',
    rejected: 'var(--accent-rose)', confirmed: 'var(--accent-blue)', waitlisted: 'var(--accent-purple)'
  }

  return (
    <div className="page fade-in">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 2rem)' }}>Welcome, {user.name}</h1>
          <p>Dashboard & Status</p>
        </div>
      </div>

      <div className="card-grid cols-2" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Registration Info */}
        <div className="card">
          <div className="section-title">📊 Registration Details</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Status</span>
            <span style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700,
              background: `${statusColor[user.registrationStatus]}22`,
              color: statusColor[user.registrationStatus]
            }}>
              {user.registrationStatus?.toUpperCase()}
            </span>
          </div>
          <table style={{ width: '100%' }}>
            <tbody>
              {[
                ['Type', user.userType.charAt(0).toUpperCase() + user.userType.slice(1)],
                ['ID', user.registerNumber || user.employeeId],
                ['Boarding Point', user.boardingPoint],
                user.allocatedRoute ? ['Allocated Route', `${user.allocatedRoute.routeNumber}`] : null
              ].filter(Boolean).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: '0.9rem', borderBottom: '1px solid var(--border-glass)' }}>{k}</td>
                  <td style={{ padding: '8px 0', fontWeight: 500, fontSize: '0.9rem', textAlign: 'right', borderBottom: '1px solid var(--border-glass)', wordBreak: 'break-word' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment Section */}
        <div className="card">
          <div className="section-title">💳 Payment Status</div>

          {/* Advance Payment Details (Student only) */}
          {isStudent && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>Advance Payment (₹5,000)</div>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                {user.advancePaid
                  ? <span style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>✅ Confirmed</span>
                  : user.receiptFile
                    ? <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>⏳ Receipt Uploaded - Pending</span>
                    : <span style={{ color: 'var(--accent-rose)', fontWeight: 'bold' }}>❌ Not Paid</span>
                }
              </div>
              {user.advanceReceiptNumber && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Receipt #: {user.advanceReceiptNumber}
                </div>
              )}
              {user.advancePaymentDate && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Paid on: {new Date(user.advancePaymentDate).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {/* Fee Breakdown */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>Fee Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Annual Fee</span>
                <span style={{ fontWeight: 600 }}>₹{totalAmount.toLocaleString()}</span>
              </div>
              {isStudent && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Advance Paid</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>- ₹{advanceAmount.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', borderTop: '1px solid var(--border-glass)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Payable Amount</span>
                <span style={{ fontWeight: 800, color: 'var(--accent-amber)' }}>₹{payableAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Final Fee Payment Status */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>Final Fee Payment</div>
            <div style={{ fontSize: '1.1rem' }}>
              {user.fullFeePaid ? <span style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>✅ Confirmed</span> :
               user.finalReceiptFile ? <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>⏳ Receipt Uploaded - Pending</span> :
               <span style={{ color: 'var(--accent-rose)', fontWeight: 'bold' }}>❌ Not Paid</span>}
            </div>
            {user.finalConfirmationMethod && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Method: {user.finalConfirmationMethod}
              </div>
            )}
          </div>

          {/* Upload Final Fee Receipt */}
          {!user.fullFeePaid && !user.finalReceiptFile && (
            <div style={{ marginTop: '1rem' }}>
              <div className="section-title" style={{ fontSize: '0.9rem' }}>📤 Upload Final Fee Receipt</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Upload your final fee payment receipt (PDF). Filename must match your ID: <strong>{user.registerNumber || user.employeeId}.pdf</strong>
              </p>
              <div className="upload-zone" onClick={() => document.getElementById('finalPdfInput').click()} style={{ padding: '1.5rem 1rem' }}>
                <div className="icon" style={{ fontSize: '2rem' }}>📄</div>
                <p style={{ fontSize: '0.85rem' }}>{finalFile ? `Selected: ${finalFile.name}` : 'Click to select final PDF receipt'}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  PDF only • Max 5MB
                </p>
              </div>
              <input id="finalPdfInput" type="file" accept=".pdf" style={{ display: 'none' }}
                onChange={e => setFinalFile(e.target.files[0])} />

              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}
                disabled={uploadingFinal || !finalFile} onClick={handleFinalUpload}>
                {uploadingFinal ? 'Uploading...' : '⬆ Upload Final Receipt'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Section */}
      <div className="card" style={{ maxWidth: '1000px', margin: '1.5rem auto 0' }}>
        <div className="section-title">❌ Cancellation Request</div>
        {user.registrationStatus === 'cancelled' || user.cancellationRequested ? (
          <div style={{
            padding: '1.25rem',
            background: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(245, 158, 11, 0.5)',
            marginTop: '0.75rem'
          }}>
            <p style={{ fontWeight: 600, color: 'var(--accent-amber)', marginBottom: '0.5rem' }}>Registration Cancelled</p>
            <p style={{ fontSize: '0.85rem' }}>Your transport registration has already been cancelled.</p>
            {user.cancellationReason && <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontStyle: 'italic' }}>Reason: {user.cancellationReason}</p>}
          </div>
        ) : user.fullFeePaid ? (
          <div style={{
            padding: '1.25rem',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            marginTop: '0.75rem'
          }}>
            <p style={{ fontWeight: 600, color: 'var(--accent-rose)', marginBottom: '0.5rem' }}>❌ Cancellation Not Available</p>
            <p style={{ fontSize: '0.85rem' }}>You have already paid the full fees. Cancellation is not permitted after complete payment.</p>
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reason for Cancellation</label>
            <textarea
              className="form-control"
              rows={3}
              value={cancelReason}
              onChange={e => {
                setCancelReason(e.target.value)
                if (cancelOtpSent) {
                  setCancelOtpSent(false)
                  setCancelOtp('')
                }
              }}
              placeholder="State your reason briefly..."
            />

            {!cancelOtpSent ? (
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={sendingCancelOtp || !cancelReason.trim()}
                onClick={sendCancellationOtp}
              >
                {sendingCancelOtp ? 'Sending OTP...' : 'Send OTP for Cancellation'}
              </button>
            ) : (
              <>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Enter OTP *</label>
                  <input
                    className="form-control"
                    placeholder="Enter 6-digit OTP"
                    value={cancelOtp}
                    onChange={e => setCancelOtp(e.target.value)}
                  />
                  <small style={{ color: 'var(--text-muted)' }}>OTP sent to {user.mailId}</small>
                </div>
                <button
                  className="btn btn-danger"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                  disabled={canceling || !cancelReason.trim() || !cancelOtp.trim()}
                  onClick={submitCancellation}
                >
                  {canceling ? 'Verifying & Submitting...' : 'Verify OTP & Submit Cancellation'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
