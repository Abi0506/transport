import { Link, useLocation, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = sessionStorage.getItem('currentUser')
  const isOffice = location.pathname === '/office'

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser')
    navigate('/')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <img src="/logo.png" alt="PSG iTech Logo" style={{ height: '40px', objectFit: 'contain' }} />
        <div>
          <div className="logo">PSG iTech Transport App</div>
          <div className="sub">PSG iTech &amp; IAP</div>
        </div>
      </Link>
      <div className="navbar-links">
        {/* Hide login/logout buttons on /office page */}
        {!isOffice && (
          currentUser ? (
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">Logout</button>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
          )
        )}
      </div>
    </nav>
  )
}
