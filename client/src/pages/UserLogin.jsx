import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function UserLogin() {
  const [id, setId] = useState('')
  const [dob, setDob] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/user-login', { id, dob })
      localStorage.setItem('userToken', res.data.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container fade-in">
      <div className="card login-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>👋</div>
          <h2>User Login</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Upload Receipt & Check Status</p>
        </div>
        
        <div style={{ background: 'var(--bg-glass)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>Note:</strong> You must complete your <a href="/" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>Registration</a> first before logging in.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Register Number / Employee ID</label>
            <input className="form-control" value={id} onChange={e => setId(e.target.value)} placeholder="e.g. 22IT001 or EMP123" required />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input className="form-control" type="date" value={dob} onChange={e => setDob(e.target.value)} required />
          </div>
          {error && <p className="form-error" style={{ marginBottom: '1rem', color: 'var(--accent-rose)' }}>{error}</p>}
          <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login →'}
          </button>
        </form>
      </div>
    </div>
  )
}
