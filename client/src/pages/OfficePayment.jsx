import { useState } from 'react'
import axios from 'axios'

export default function OfficePayment() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [officeId, setOfficeId] = useState('')
  const [officePassword, setOfficePassword] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [record, setRecord] = useState(null)

  const officeLogin = async () => {
    if (!officeId || !officePassword) {
      setToast({ type: 'error', msg: 'Enter office ID and password' })
      setTimeout(() => setToast(null), 3000)
      return
    }
    // Simple office authentication (can be enhanced with backend validation)
    setIsLoggedIn(true)
    setToast({ type: 'success', msg: 'Office login successful' })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setOfficeId('')
    setOfficePassword('')
    setRollNumber('')
    setReceiptNumber('')
    setRecord(null)
    // Clear any current user session
    sessionStorage.removeItem('currentUser')
  }

  const confirmReceipt = async () => {
    if (!rollNumber || !receiptNumber) {
      setToast({ type: 'error', msg: 'Enter roll/staff ID and receipt number' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    setLoading(true)
    try {
      const res = await axios.post('/api/payment/confirm-manual', {
        rollNumber: rollNumber.trim(),
        receiptNumber: receiptNumber.trim()
      })
      setToast({ type: 'success', msg: res.data.message })
      setRecord(res.data.payment)
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
          
          <div className="form-group">
            <label>Staff ID *</label>
            <input className="form-control" value={officeId} onChange={e => setOfficeId(e.target.value)} placeholder="Enter office ID" />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input className="form-control" type="password" value={officePassword} onChange={e => setOfficePassword(e.target.value)} placeholder="Enter password" />
          </div>
          <button className="btn btn-primary" onClick={officeLogin}>
            Login
          </button>
        </div>
      ) : (
        /* Receipt Verification Form - shown after login */
        <div className="card" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
             
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
          <div className="form-group">
            <label>Roll Number / Staff ID *</label>
            <input className="form-control" value={rollNumber} onChange={e => setRollNumber(e.target.value)} placeholder="Enter roll number or staff ID" />
          </div>
          <div className="form-group">
            <label>Receipt Number *</label>
            <input className="form-control" value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} placeholder="Enter receipt number" />
          </div>
          <button className="btn btn-primary" onClick={confirmReceipt} disabled={loading}>
            {loading ? 'Confirming...' : 'Confirm'}
          </button>

          {record && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verified Receipt</div>
              <div style={{ fontWeight: 700, marginTop: '0.4rem' }}>{record.rollNumber}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Receipt Number: {record.receiptNumber}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
