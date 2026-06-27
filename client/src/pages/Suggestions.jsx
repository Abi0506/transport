import { useState } from 'react'
import axios from 'axios'

export default function Suggestions() {
  const [registerNumber, setRegisterNumber] = useState('')
  const [mailId, setMailId] = useState('')
  const [routeSuggestion, setRouteSuggestion] = useState('')
  const [status, setStatus] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setStatus(null)
    const normalizedMail = (mailId || '').trim().toLowerCase()
    if (!normalizedMail.endsWith('@psgitech.ac.in') && !normalizedMail.endsWith('@psgiap.ac.in')) {
      setStatus({ type: 'error', msg: 'Email must be a psgitech.ac.in or psgiap.ac.in address' })
      return
    }
    if (!registerNumber.trim() || !routeSuggestion.trim()) {
      setStatus({ type: 'error', msg: 'Please fill all fields' })
      return
    }

    // Validate register number OR staff id: accept student reg that starts with 715 and 12 digits OR staff id (alphanumeric)
    const r = registerNumber.trim()
    const digits = r.replace(/\D/g, '')
    let payload = { mailId: normalizedMail, routeSuggestion: routeSuggestion.trim() }
    if (/^715\d{9}$/.test(digits)) {
      payload.registerNumber = digits
    } else {
      const emp = r.toLowerCase()
      if (!/^[a-z0-9@._\-]{2,40}$/.test(emp)) {
        setStatus({ type: 'error', msg: 'Invalid staff ID format' })
        return
      }
      payload.employeeId = emp
    }

    try {
      await axios.post('/api/suggestions', payload)
      setStatus({ type: 'success', msg: 'Suggestion submitted — thank you!' })
      setRegisterNumber('')
      setMailId('')
      setRouteSuggestion('')
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.message || 'Failed to submit' })
    }
  }

  return (
    <div className="page" style={{ maxWidth: '720px', margin: '2rem auto' }}>
      <div className="card">
        <h2>Suggestions (Routes and Boarding Points)</h2>
        <p style={{ color: 'var(--text-muted)' }}>Help us improve routes — enter your register number/staff ID and suggestion.</p>
        <form onSubmit={submit} style={{ display: 'grid', gap: '0.75rem' }}>
          <div className="form-group">
            <label>Register Number / Staff ID</label>
            <input className="form-control" value={registerNumber} onChange={e => setRegisterNumber(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Mail ID (PSG domain)</label>
            <input className="form-control" value={mailId} onChange={e => setMailId(e.target.value)} placeholder="you@psgitech.ac.in" />
          </div>
          <div className="form-group">
            <label>Route suggestion</label>
            <textarea className="form-control" rows={6} value={routeSuggestion} onChange={e => setRouteSuggestion(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" type="submit">Submit</button>
            <button className="btn btn-secondary" type="button" onClick={() => { setRegisterNumber(''); setMailId(''); setRouteSuggestion(''); setStatus(null) }}>Clear</button>
          </div>
          {status && <div className={`toast ${status.type === 'error' ? 'error' : 'success'}`}>{status.msg}</div>}
        </form>
      </div>
    </div>
  )
}
