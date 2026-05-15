import { Link, useLocation, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = sessionStorage.getItem('currentUser')
  const isOffice = location.pathname === '/office'
  const hideAuthButtons = location.pathname === '/login' || location.pathname.startsWith('/admin') || location.pathname.startsWith('/register') || isOffice

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser')
    navigate('/')
  }

  return (
    <nav className="navbar" style={{ borderBottom: '1px solid var(--border-color)', height: '64px' }}>
      <Link to="/" className="navbar-brand">
        <img src="https://i.ibb.co/dwmwTKrm/3-TL-Logo-with-white.jpg" alt="3TL Logo" style={{ height: '32px', objectFit: 'contain' }} />
        <div style={{ paddingLeft: '10px' }}>
          <div className="logo" style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: '700' }}>Transport Portal</div>
        </div>
      </Link>
      <div className="navbar-links">
        {!hideAuthButtons && (
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
