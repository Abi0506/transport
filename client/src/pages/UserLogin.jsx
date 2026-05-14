import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function UserLogin() {
  const [id, setId] = useState('')
  const [dob, setDob] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userData, setUserData] = useState(null)
  const navigate = useNavigate()

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

  // Calculate remaining payment
  const getRemainingPayment = () => {
    if (!userData) return 0
    if (!userData.finalFees) return 0
    if (userData.fullFeePaid) return 0
    
    const advance = userData.advancePaid ? 5000 : 0
    const remaining = userData.finalFees - advance
    return Math.max(0, remaining)
  }

  // If user data is loaded, show payment info and redirect
  if (userData) {
    const remainingAmount = getRemainingPayment()
    
    setTimeout(() => navigate('/dashboard'), 2000)
    
    return (
      <div className="login-container fade-in">
        <div className="card login-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ marginBottom: '1.5rem' }}>Welcome, {userData.name}!</h2>
          
          {!userData.fullFeePaid && (
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b15 0%, #f59e0b30 100%)',
              border: '2px solid #f59e0b',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                💰 Remaining Amount to Pay
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b', marginBottom: '0.5rem' }}>
                ₹{remainingAmount.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {userData.advancePaid ? 'Advance paid • Please pay the remaining fee' : 'Please pay the full annual fee'}
              </div>
            </div>
          )}
          
          {userData.fullFeePaid && (
            <div style={{
              background: 'linear-gradient(135deg, #10b98115 0%, #10b98130 100%)',
              border: '2px solid #10b981',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '1.2rem', color: '#10b981' }}>
                ✓ All fees paid
              </div>
            </div>
          )}
          
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
        
        <div style={{ background: 'var(--bg-glass)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>Note:</strong> You must complete your <a href="/" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>Registration</a> first before logging in.
          </p>
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
