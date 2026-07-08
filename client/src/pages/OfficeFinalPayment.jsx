import { useMemo, useState } from 'react'
import axios from 'axios'

export default function OfficeFinalPayment() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [summary, setSummary] = useState(null)

  const fileLabel = useMemo(() => {
    if (!selectedFile) return 'No file selected'
    return selectedFile.name
  }, [selectedFile])

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setToast({ type: 'error', msg: 'Only PDF files are allowed' })
      setSelectedFile(null)
      event.target.value = ''
      return
    }

    setSelectedFile(file)
    setSummary(null)
    setToast(null)
  }

  const uploadPdf = async () => {
    if (!selectedFile) {
      setToast({ type: 'error', msg: 'Please select a PDF file first' })
      return
    }

    const formData = new FormData()
    formData.append('pdf', selectedFile)

    setLoading(true)
    setToast(null)

    try {
      const res = await axios.post('/api/payment/import-final-payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSummary(res.data)
      setToast({ type: 'success', msg: res.data.message || 'PDF processed successfully' })
    } catch (err) {
      setSummary(null)
      setToast({
        type: 'error',
        msg: err.response?.data?.message || 'Unable to process the PDF'
      })
    } finally {
      setLoading(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <div className="page fade-in">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      <div className="card" style={{ maxWidth: '920px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2>Office Final Payment Import</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0.25rem 0 0 0' }}>
            Upload a PDF containing Roll no, Receipt no, and MISCELLANEOUS AMOUNT to import final payments.
          </p>
        </div>

        <div
          style={{
            border: '1px dashed var(--border-color)',
            borderRadius: '14px',
            padding: '1.25rem',
            background: 'var(--bg-glass)',
            marginBottom: '1rem'
          }}
        >
          <div className="form-group">
            <label>Upload PDF *</label>
            <input
              className="form-control"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
            />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Selected file: {fileLabel}
          </div>
          <button className="btn btn-primary" onClick={uploadPdf} disabled={loading || !selectedFile}>
            {loading ? 'Processing...' : 'Upload PDF'}
          </button>
        </div>

        {summary && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div
              style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'
              }}
            >
              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total rows processed</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{summary.totalRowsProcessed || 0}</div>
              </div>
              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Successful imports</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                  {summary.successfulImports || 0}
                </div>
              </div>
              <div className="card" style={{ padding: '1rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Failed imports</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                  {summary.failedImports || 0}
                </div>
              </div>
            </div>

            {Array.isArray(summary.failedRecords) && summary.failedRecords.length > 0 && (
              <div className="card" style={{ padding: '1rem', overflowX: 'auto' }}>
                <h3 style={{ marginTop: 0 }}>Failed Records</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Roll no</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Receipt no</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Amount</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.failedRecords.map((item, index) => (
                      <tr key={`${item.rollNumber || 'row'}-${index}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{item.rollNumber || '-'}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{item.receiptNumber || '-'}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{item.miscellaneousAmount ?? '-'}</td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--accent-rose)' }}>{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
