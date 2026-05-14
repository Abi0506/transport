import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="fade-in">
      <section className="hero">
        <h1>PSG iTech <span>Transport</span><br />Registration Portal</h1>
        <p>Register for college bus transport facility for AY 2026–27.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register/student" className="btn btn-primary btn-lg">Student Registration</Link>
          <Link to="/register/employee" className="btn btn-secondary btn-lg">Faculty / Staff</Link>
        </div>
      </section>

      {/* Advance Payment Notice */}
      <div className="advance-notice">
        <div className="advance-notice-content">
          <div className="advance-notice-icon">💰</div>
          <div>
            <h3 className="advance-notice-title">
              Advance Payment ₹5,000 is mandatory for registration.
            </h3>
            <p className="advance-notice-subtext">
              ✓ Fully refundable if seat not allocated
            </p>
          </div>
        </div>
      </div>

      {/* Registration Cards */}
      <div className="card-grid cols-2" style={{ marginTop: '0', marginBottom: '3rem' }}>
        <Link to="/register/student" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <div className="card">
            <div className="card-icon blue">🎓</div>
            <h3>Student Registration</h3>
            <p>Day scholar students from 1st to 5th year. Distance from college is the primary criterion for seat allocation.</p>
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--accent-amber)' }}>Phase I: 2nd–5th Year • Phase II: 1st Year</div>
          </div>
        </Link>
          <Link to="/register/employee" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div className="card hover-glow">
              <div className="card-icon emerald">👨‍🏫</div>
              <h3>Faculty / Staff Registration</h3>
              <p>Teaching and non-teaching members. Senior members get first preference.</p>
              <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>15% seats reserved total</div>
            </div>
          </Link>
      </div>

      {/* Important Dates */}
      <div className="page" style={{ maxWidth: '900px' }}>
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📅 Important Dates — AY 2026–27
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="dates-table">
              <thead>
                <tr>
                  <th>Year of Study</th>
                  <th>Registration Opens</th>
                  <th>Registration Closes</th>
                  <th>Seat Allocation</th>
                  <th>Fee Deadline</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>2nd – 5th Year & Staff/Faculty</strong></td>
                  <td>15 May 2026</td>
                  <td>26 Jun 2026</td>
                  <td>30 Jun 2026</td>
                  <td>10 Jul 2026</td>
                </tr>
                <tr>
                  <td><strong>1st Year</strong></td>
                  <td>1 Jul 2026</td>
                  <td>31 Jul 2026</td>
                  <td>1 Aug 2026</td>
                  <td>15 Aug 2026</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>📋 Allocation Norms</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.08)', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-blue)' }}>85%</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Students</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.08)', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-emerald)' }}>9%</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Faculty</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(139,92,246,0.08)', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-purple)' }}>6%</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Staff</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>💰 Advance Payment</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            An advance of <strong style={{ color: 'var(--accent-amber)' }}>₹5,000</strong> must be paid before the final annual fee payment. 
            This amount is <strong>fully refundable</strong> if seat is not allocated. 
            Login to upload the payment receipt or visit the office for manual confirmation.
          </p>
        </div>
      </div>
    </div>
  )
}
