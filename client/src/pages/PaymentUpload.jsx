import { useState } from 'react'
import axios from 'axios'

export default function PaymentUpload() {
  const [rollNumber, setRollNumber] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [registrationId, setRegistrationId] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState(null)
  const [status, setStatus] = useState(null)

  const handleUpload = async () => {
    if (!file || !rollNumber || !receiptNumber) {
      setToast({ type: 'error', msg: 'Please enter roll number, receipt number, and select a PDF file' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    const fileBaseName = file.name.replace(/\.pdf$/i, '')
    if (fileBaseName !== rollNumber.trim()) {
      setToast({ type: 'error', msg: 'PDF filename must match your roll number or staff ID' })
      setTimeout(() => setToast(null), 3500)
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('receipt', file)
    formData.append('rollNumber', rollNumber.trim())
    formData.append('receiptNumber', receiptNumber.trim())
    formData.append('registrationId', registrationId)
    try {
      const res = await axios.post('/api/payment/upload-receipt', formData)
      setToast({ type: 'success', msg: res.data.message })
      setFile(null)
    } catch (err) {
      setToast({ type: 'error', msg: err.response?.data?.message || 'Upload failed' })
    } finally {
      setUploading(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const checkStatus = async () => {
    if (!rollNumber) return
    try {
      const res = await axios.get(`/api/payment/status/${rollNumber}`)
      setStatus(res.data)
    } catch {
      setStatus({ paidStatus: 'not_found' })
    }
  }

  return (
    <div className="page fade-in">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1>💳 Payment & Receipt Upload</h1>
        <p>Upload your ₹5,000 advance payment receipt PDF and enter the receipt number</p>
      </div>

      <div className="card-grid cols-2" style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Upload Section */}
        <div className="card">
          <div className="section-title" style={{ color: 'var(--accent-blue)', fontWeight: 700, marginBottom: '1rem' }}>
            📤 Upload Receipt
          </div>
          <div className="form-group">
            <label>Roll Number / Employee ID *</label>
            <input className="form-control" value={rollNumber}
              onChange={e => setRollNumber(e.target.value)} placeholder="e.g. 22IT001" />
          </div>
          <div className="form-group">
            <label>Receipt Number *</label>
            <input className="form-control" value={receiptNumber}
              onChange={e => setReceiptNumber(e.target.value)} placeholder="Enter receipt number" />
          </div>
          <div className="form-group">
            <label>Registration ID (optional)</label>
            <input className="form-control" value={registrationId}
              onChange={e => setRegistrationId(e.target.value)} placeholder="From registration confirmation" />
          </div>
          <div className="upload-zone" onClick={() => document.getElementById('pdfInput').click()}>
            <div className="icon">📄</div>
            <p>{file ? `Selected: ${file.name}` : 'Click to select PDF receipt'}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              PDF only • Max 5MB • Filename should be your roll number
            </p>
          </div>
          <input id="pdfInput" type="file" accept=".pdf" style={{ display: 'none' }}
            onChange={e => setFile(e.target.files[0])} />
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}
            disabled={uploading} onClick={handleUpload}>
            {uploading ? 'Uploading...' : '⬆ Upload Receipt'}
          </button>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            The PDF filename must exactly match your roll number or staff ID.
          </p>
        </div>

        {/* Status Check */}
        <div className="card">
          <div className="section-title" style={{ color: 'var(--accent-emerald)', fontWeight: 700, marginBottom: '1rem' }}>
            🔍 Check Payment Status
          </div>
          <div className="form-group">
            <label>Roll Number / Employee ID</label>
            <input className="form-control" value={rollNumber}
              onChange={e => setRollNumber(e.target.value)} placeholder="Enter to check status" />
          </div>
          <button className="btn btn-success" style={{ width: '100%' }} onClick={checkStatus}>
            Check Status
          </button>
          {status && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Status</div>
              <div style={{
                fontSize: '1.1rem', fontWeight: 700,
                color: status.paidStatus === 'confirmed' ? 'var(--accent-emerald)' :
                  status.paidStatus === 'uploaded' ? 'var(--accent-amber)' :
                    status.paidStatus === 'not_found' ? 'var(--accent-rose)' : 'var(--text-muted)'
              }}>
                {status.paidStatus === 'confirmed' ? '✅ Payment Confirmed' :
                  status.paidStatus === 'uploaded' ? '⏳ Receipt Uploaded — Pending Verification' :
                    status.paidStatus === 'not_found' ? '❌ No Payment Record Found' :
                      '⏳ Pending'}
              </div>
              {status.confirmationMethod && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Method: {status.confirmationMethod} {status.confirmedBy ? `• By: ${status.confirmedBy}` : ''}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
