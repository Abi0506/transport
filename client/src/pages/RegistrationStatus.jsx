import { useState } from 'react'
import axios from 'axios'

export default function RegistrationStatus() {
  const [query, setQuery] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const lookup = async () => {
    if (!query) return
    setError('')
    try {
      const res = await axios.get(`/api/register/lookup?registerNumber=${query}&employeeId=${query}`)
      setData(res.data)
    } catch {
      setError('No registration found for this ID')
      setData(null)
    }
  }

  const statusColor = {
    pending: 'var(--accent-amber)', allocated: 'var(--accent-emerald)',
    rejected: 'var(--accent-rose)', confirmed: 'var(--accent-blue)', waitlisted: 'var(--accent-purple)'
  }

  return (
    <div className="page fade-in">
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1>📊 Registration Status</h1>
        <p>Check your registration and allocation status</p>
      </div>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="card">
          <div className="form-group">
            <label>Register Number / Employee ID</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="form-control" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="e.g. 7155XXXXXXXX" onKeyDown={e => e.key === 'Enter' && lookup()} />
              <button className="btn btn-primary" onClick={lookup}>Search</button>
            </div>
          </div>
          {error && <p style={{ color: 'var(--accent-rose)', fontSize: '0.9rem' }}>{error}</p>}
          {data && (
            <div className="slide-up" style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>{data.name}</h3>
                <span style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                  background: `${statusColor[data.registrationStatus]}22`,
                  color: statusColor[data.registrationStatus]
                }}>
                  {data.registrationStatus?.toUpperCase()}
                </span>
              </div>
              <table style={{ width: '100%' }}>
                <tbody>
                  {[
                    ['Type', data.userType],
                    ['ID', data.registerNumber || data.employeeId],
                    ['Department', data.department],
                    ['Institution', data.institution],
                    ['Boarding Point', data.boardingPoint],
                    ['Route', data.boardingPointRoute ? `${data.boardingPointRoute.routeNumber} — ${data.boardingPointRoute.routeName}` : '—'],
                    ['Fee', `₹${data.finalFees?.toLocaleString() || '—'}`],
                    ['Phase', data.phase],
                    ['Advance Paid', data.advancePaid ? '✅ Yes' : '❌ No'],
                    data.allocatedRoute ? ['Allocated Route', `${data.allocatedRoute.routeNumber} — ${data.allocatedRoute.routeName}`] : null
                  ].filter(Boolean).map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ padding: '6px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{k}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 500, fontSize: '0.9rem' }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
