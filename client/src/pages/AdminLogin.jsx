import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await axios.post('/api/auth/login', { username, password })
      localStorage.setItem('adminToken', res.data.token)
      navigate('/admin/dashboard')
    } catch {
      setError('Invalid credentials')
    }
  }

  return (
    <div className="login-container fade-in">
      <div className="card login-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔐</div>
          <h2>Admin Login</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Transport Management Portal</p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input className="form-control" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}
          <button className="btn btn-primary" style={{ width: '100%' }} type="submit">Login →</button>
        </form>
      </div>
    </div>
  )
}
