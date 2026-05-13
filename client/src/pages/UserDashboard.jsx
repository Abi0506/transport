import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function UserDashboard() {
  const [user, setUser] = useState(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [cancelReason, setCancelReason] = useState('')
  const [cancelFile, setCancelFile] = useState(null)
  const [canceling, setCanceling] = useState(false)
  
  const [finalFile, setFinalFile] = useState(null)
  const [uploadingFinal, setUploadingFinal] = useState(false)

  const navigate = useNavigate()

  const handleFinalUpload = async () => {
    if (!finalFile) { setToast({ type: 'error', msg: 'Please select a PDF file' }); setTimeout(() => setToast(null), 3000); return; }
    setUploadingFinal(true)
    const formData = new FormData()
    formData.append('receipt', finalFile)
    formData.append('rollNumber', user.registerNumber || user.employeeId)
    formData.append('registrationId', user.registrationId || user._id)
    try {
      const res = await axios.post('/api/payment/upload-final-receipt', formData)
      setToast({ type: 'success', msg: res.data.message })
      setFinalFile(null)
      const updated = await axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem('userToken')}` } })
      setUser(updated.data)
    } catch (err) { setToast({ type: 'error', msg: err.response?.data?.message || 'Upload failed' }) } 
    finally { setUploadingFinal(false); setTimeout(() => setToast(null), 4000) }
  }

  const submitCancellation = async () => {
    if (!cancelFile || !cancelReason) return;
    setCanceling(true)
    const formData = new FormData()
    formData.append('letter', cancelFile)
    formData.append('reason', cancelReason)
    formData.append('registrationId', user.registrationId || user._id)
    try {
      const res = await axios.post('/api/payment/cancel-request', formData)
      setToast({ type: 'success', msg: res.data.message })
      const updated = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('userToken')}` }
      })
      setUser(updated.data)
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
        const token = localStorage.getItem('userToken')
        if (!token) return navigate('/login')
        const res = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUser(res.data)
      } catch (err) {
        localStorage.removeItem('userToken')
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [navigate])

  const handleUpload = async () => {
    if (!file) {
      setToast({ type: 'error', msg: 'Please select a PDF file' })
      setTimeout(() => setToast(null), 3000)
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append('receipt', file)
    formData.append('rollNumber', user.registerNumber || user.employeeId)
    formData.append('registrationId', user.registrationId)
    try {
      const res = await axios.post('/api/payment/upload-receipt', formData)
      setToast({ type: 'success', msg: res.data.message })
      setFile(null)
      // refresh user
      const updated = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('userToken')}` }
      })
      setUser(updated.data)
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Upload failed' })
    } finally {
      setUploading(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const logout = () => {
    localStorage.removeItem('userToken')
    navigate('/')
  }

  if (loading) return <div className="page" style={{ textAlign: 'center', paddingTop: '4rem' }}><h2>Loading...</h2></div>
  if (!user) return null

  const statusColor = {
    pending: 'var(--accent-amber)', allocated: 'var(--accent-emerald)',
    rejected: 'var(--accent-rose)', confirmed: 'var(--accent-blue)', waitlisted: 'var(--accent-purple)'
  }

  const paymentStatusDisplay = () => {
    if (user.advancePaid) return <span style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>✅ Confirmed</span>
    if (user.receiptUrl) return <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>⏳ Receipt Uploaded - Pending</span>
    return <span style={{ color: 'var(--accent-rose)', fontWeight: 'bold' }}>❌ Not Paid</span>
  }

  return (
    <div className="page fade-in">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Welcome, {user.name}</h1>
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
                ['Route', user.boardingPointRoute ? `${user.boardingPointRoute.routeNumber} — ${user.boardingPointRoute.routeName}` : '—'],
                user.allocatedRoute ? ['Allocated Route', `${user.allocatedRoute.routeNumber} — ${user.allocatedRoute.routeName}`] : null
              ].filter(Boolean).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: '0.9rem', borderBottom: '1px solid var(--border-glass)' }}>{k}</td>
                  <td style={{ padding: '8px 0', fontWeight: 500, fontSize: '0.9rem', textAlign: 'right', borderBottom: '1px solid var(--border-glass)' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment Section */}
        <div className="card">
          <div className="section-title">💳 Payment Status</div>
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Advance Payment Status</div>
            <div style={{ fontSize: '1.1rem' }}>
              {paymentStatusDisplay()}
            </div>
            {user.confirmationMethod && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Method: {user.confirmationMethod} {user.confirmedBy ? `• By: ${user.confirmedBy}` : ''}
              </div>
            )}
          </div>

          {!user.advancePaid && (
            <div style={{ marginTop: '2rem' }}>
              <div className="section-title">📤 Upload Advance Receipt</div>
              <div className="upload-zone" onClick={() => document.getElementById('pdfInput').click()}>
                <div className="icon">📄</div>
                <p>{file ? `Selected: ${file.name}` : 'Click to select PDF receipt'}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  PDF only • Max 5MB • Advance ₹5,000
                </p>
              </div>
              <input id="pdfInput" type="file" accept=".pdf" style={{ display: 'none' }}
                onChange={e => setFile(e.target.files[0])} />
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}
                disabled={uploading || !file} onClick={handleUpload}>
                {uploading ? 'Uploading...' : '⬆ Upload Receipt'}
              </button>
            </div>
          )}

          {user.advancePaid && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Final Fee Payment Status</div>
              <div style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                {user.fullFeePaid ? <span style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>✅ Confirmed</span> : 
                 user.finalReceiptFile ? <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>⏳ Receipt Uploaded - Pending</span> : 
                 <span style={{ color: 'var(--accent-rose)', fontWeight: 'bold' }}>❌ Not Paid</span>}
              </div>

              {!user.fullFeePaid && user.registrationStatus === 'allocated' && (
                <>
                  <div className="section-title">📤 Upload Final Fee Receipt</div>
                  <div className="upload-zone" onClick={() => document.getElementById('finalPdfInput').click()}>
                    <div className="icon">📄</div>
                    <p>{finalFile ? `Selected: ${finalFile.name}` : 'Click to select final PDF receipt'}</p>
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
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Section */}
      <div className="card" style={{ maxWidth: '1000px', margin: '1.5rem auto 0' }}>
        <div className="section-title">❌ Cancellation Request</div>
        {user.cancellationRequested ? (
          <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.5)' }}>
            <p style={{ fontWeight: 600, color: 'var(--accent-amber)' }}>Cancellation Request Submitted</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Your request is under review by the transport office.</p>
            {user.cancellationReason && <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontStyle: 'italic' }}>Reason: {user.cancellationReason}</p>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reason for Cancellation</label>
              <textarea className="form-control" rows={4} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="State your reason briefly..." />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Supporting Document / Letter (PDF)</label>
              <div className="upload-zone" style={{ minHeight: '100px', padding: '1rem' }} onClick={() => document.getElementById('cancelPdfInput').click()}>
                <p>{cancelFile ? `Selected: ${cancelFile.name}` : 'Click to select PDF letter'}</p>
              </div>
              <input id="cancelPdfInput" type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => setCancelFile(e.target.files[0])} />
              <button className="btn btn-danger" style={{ width: '100%', marginTop: '1rem' }} disabled={canceling || !cancelReason || !cancelFile} onClick={submitCancellation}>
                {canceling ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
