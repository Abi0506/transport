import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="fade-in">
      <section className="hero" style={{ background: 'var(--bg-secondary)', padding: '6rem 2rem 5rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
          <img src="https://i.ibb.co/dwmwTKrm/3-TL-Logo-with-white.jpg" alt="3TL Logo" className="hide-mobile" style={{ height: '80px', objectFit: 'contain' }} />
          <h1 style={{ color: 'var(--text-primary)', fontSize: '3.5rem', fontWeight: '800', letterSpacing: '-0.03em', margin: 0 }}>Transport <span style={{ color: 'var(--accent-blue)' }}>Portal</span></h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', marginBottom: '2.5rem' }}>Secure your seat for the academic year 2026–27.</p>
        <div className="hero-actions">
          <div className="hero-primary-actions">
            <Link to="/register/student" className="btn btn-primary" style={{ padding: '0.8rem 1.5rem', fontSize: '1rem', borderRadius: '6px', minWidth: '220px', justifyContent: 'center' }}>Student Registration</Link>
            <Link to="/register/employee" className="btn btn-secondary" style={{ padding: '0.8rem 1.5rem', fontSize: '1rem', borderRadius: '6px', minWidth: '220px', justifyContent: 'center' }}>Faculty & Staff</Link>
          </div>
          <div className="hero-secondary-actions">
            <Link
              to="/suggestions"
              className="btn btn-ghost"
              style={{ padding: '0.85rem 1.5rem', fontSize: '1rem', borderRadius: '6px' }}
            >
              Suggestions (Routes and Boarding Points)
            </Link>
          </div>
        </div>
      </section>

      {/* Student Advance Notice */}
      <div
        className="card"
        style={{
          maxWidth: '900px',
          margin: '0 auto 3rem',
          padding: '2rem 2.25rem',
          border: '2px solid rgba(59, 130, 246, 0.35)',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(14, 165, 233, 0.06))',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '2.25rem', lineHeight: 1 }}>⚠️</div>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              For students only
            </h3>
            <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--text-primary)', fontWeight: 700 }}>
              Upcoming 2nd to 5th year students, pay the advance of Rs. 5000 in the office before registering in this platform.
            </p>
          </div>
        </div>
      </div>

      {/* Registration Cards */}
      <div className="card-grid cols-2" style={{ marginTop: '0', marginBottom: '3rem' }}>
        <Link to="/register/student" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <div className="card" style={{ padding: '2rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Student Registration</h3>
            <p style={{ margin: '0', color: 'var(--text-secondary)' }}>Day scholar students from 1st to 5th year. Distance from college is the primary criterion for seat allocation.</p>
            <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>Phase I: 2nd–5th Year • Phase II: 1st Year</div>
          </div>
        </Link>
          <Link to="/register/employee" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div className="card hover-glow" style={{ padding: '2rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Faculty & Staff</h3>
              <p style={{ margin: '0', color: 'var(--text-secondary)' }}>Teaching and non-teaching members. Senior members given preference.</p>
              <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>15% seats reserved total</div>
            </div>
          </Link>
      </div>

      {/* Important Dates */}
      <div className="page" style={{ maxWidth: '900px' }}>
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: '600' }}>
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

        <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontWeight: '600' }}>📋 Allocation Norms</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>85%</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500', marginTop: '0.5rem' }}>Students</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>9%</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500', marginTop: '0.5rem' }}>Faculty</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>6%</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500', marginTop: '0.5rem' }}>Staff</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontWeight: '600' }}>💰 Advance Payment</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '1rem' }}>
            An advance of <strong style={{ color: 'var(--text-primary)', fontWeight: '600' }}>₹5,000</strong> must be paid before the final annual fee payment. 
            This amount is <strong style={{ color: 'var(--text-primary)', fontWeight: '600' }}>fully refundable</strong> if seat is not allocated. 
            Login to upload the payment receipt or visit the office for manual confirmation.
          </p>
        </div>
      </div>
    </div>
  )
}
