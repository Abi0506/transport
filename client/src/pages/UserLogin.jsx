import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function UserLogin() {
  const [id, setId] = useState('')
  const [dob, setDob] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!userData) return
    const timer = setTimeout(() => navigate('/dashboard'), 2500)
    return () => clearTimeout(timer)
  }, [navigate, userData])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/user-login', { id, dob })
      sessionStorage.setItem('currentUser', JSON.stringify(res.data.user))
      setUserData(res.data.user)
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
      setLoading(false)
    }
  }

  // If user data is loaded, show payment info and redirect
  if (userData) {
    return (
      <div className="login-container fade-in">
        <div className="card login-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ marginBottom: '1.5rem' }}>Welcome, {userData.name}!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container fade-in">
      <div className="card login-card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2>User Login</h2>
        </div>

       

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Register Number / Staff ID</label>
            <input className="form-control" value={id} onChange={e => setId(e.target.value)} required />
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
