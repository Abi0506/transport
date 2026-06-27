import { useState } from 'react'
import axios from 'axios'

export default function OfficePayment() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [officeId, setOfficeId] = useState('')
  const [officePassword, setOfficePassword] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [record, setRecord] = useState(null)

  const isValidRegisterNumber = (value) => /^(7155|7158)(22|23|24|25)\d{6}$/.test(value)
  const isValidReceiptNumber = (value) => /^\d{4}$/.test(value) && Number(value) >= 18

  const officeLogin = async () => {
    if (!officeId || !officePassword) {
      setToast({ type: 'error', msg: 'Enter office ID and password' })
      setTimeout(() => setToast(null), 3000)
      return
    }
    
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/office-login', {
        officeId: officeId.trim(),
        password: officePassword.trim()
      })
      setIsLoggedIn(true)
      setToast({ type: 'success', msg: res.data.message || 'Office login successful' })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed'
      setToast({ type: 'error', msg: message })
      setIsLoggedIn(false)
      setTimeout(() => setToast(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setOfficeId('')
    setOfficePassword('')
    setRollNumber('')
    setReceiptNumber('')
    setPaymentDate('')
    setRecord(null)
    // Clear any current user session
    sessionStorage.removeItem('currentUser')
  }

  const confirmReceipt = async () => {
    const trimmedRollNumber = rollNumber.trim()
    const trimmedReceiptNumber = receiptNumber.trim()

    if (!trimmedRollNumber || !trimmedReceiptNumber || !paymentDate) {
      setToast({ type: 'error', msg: 'Enter roll/staff ID, receipt number, and date of payment' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    if (!isValidRegisterNumber(trimmedRollNumber)) {
      setToast({ type: 'error', msg: 'Register number must start with 715 and be exactly 12 digits' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    if (!isValidReceiptNumber(trimmedReceiptNumber)) {
      setToast({ type: 'error', msg: 'Receipt number must be exactly 4 digits and start from 0018 or above' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    setLoading(true)
    try {
      const res = await axios.post('/api/payment/confirm-manual', {
        rollNumber: trimmedRollNumber,
        receiptNumber: trimmedReceiptNumber,
        paymentDate
      })
      setToast({ type: 'success', msg: res.data.message })
      setRecord(res.data.payment)
      
      // Reset form fields for next entry after 2 seconds
      setTimeout(() => {
        setRollNumber('')
        setReceiptNumber('')
        setPaymentDate('')
        setRecord(null)
      }, 2000)
    } catch (err) {
      const message = err.response?.status === 404
        ? 'No registration found for this roll/staff ID'
        : err.response?.data?.message || 'Verification failed'
      setToast({ type: 'error', msg: message })
      setRecord(null)
    } finally {
      setLoading(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <div className="page fade-in">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}



      {!isLoggedIn ? (
        /* Office Login Page */
        <div className="card" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1rem' }}>Office Payment Verification</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Use your office credentials to verify and confirm payments.
          </p>
          
          <div className="form-group">
            <label>Office ID *</label>
            <input className="form-control" value={officeId} onChange={e => setOfficeId(e.target.value)} placeholder="Office ID" />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input className="form-control" type="password" value={officePassword} onChange={e => setOfficePassword(e.target.value)} placeholder="Enter office password" />
          </div>
          <button className="btn btn-primary" onClick={officeLogin} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      ) : (
        /* Receipt Verification Form - shown after login */
        <div className="card" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>Verify & Confirm Payment Receipt</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
                Enter student register number and receipt number to verify and confirm payment
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
          <div className="form-group">
            <label>Register Number *</label>
            <input
              className="form-control"
              value={rollNumber}
              onChange={e => setRollNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="Enter register number"
              inputMode="numeric"
              maxLength={12}
            />
            {rollNumber && !isValidRegisterNumber(rollNumber) && (
              <small style={{ color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>
                Register Number must be 12 digits, start with 7155 or 7158, and include year code 22-25 at positions 5-6.
              </small>
            )}
          </div>
          <div className="form-group">
            <label>Receipt Number *</label>
            <input
              className="form-control"
              value={receiptNumber}
              onChange={e => setReceiptNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Enter receipt number"
              inputMode="numeric"
              maxLength={4}
            />
            {receiptNumber && !isValidReceiptNumber(receiptNumber) && (
              <small style={{ color: 'var(--accent-rose)', marginTop: '0.25rem', display: 'block' }}>
                Receipt number must be 4 digits and at least 0018
              </small>
            )}
          </div>
          <div className="form-group">
            <label>Date of Payment *</label>
            <input
              className="form-control"
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <button className="btn btn-primary" onClick={confirmReceipt} disabled={loading}>
            {loading ? 'Confirming...' : 'Confirm'}
          </button>

          {record && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verified Receipt</div>
              <div style={{ fontWeight: 700, marginTop: '0.4rem' }}>{record.rollNumber}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Receipt Number: {record.receiptNumber}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Date of Payment: {record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : paymentDate}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
