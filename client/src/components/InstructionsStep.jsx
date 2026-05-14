export default function InstructionsStep({ accepted, setAccepted }) {
  return (
    <div className="slide-up">
      <div className="doc-viewer">
        <h2>📜 Instructions & Undertaking — Transport Section</h2>
        <p>PSG iTech is operating college buses to various locations covering Coimbatore and Tiruppur district, for the benefit of day scholar students, faculty and staff members.</p>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem' }}>Rules & Regulations</h3>
        <ul>
          <li>Students can avail the transport facility after paying the <strong>annual transport fees in single instalment</strong>. Allotment is purely based on first come first serve basis who abide the office of Transport rules and regulations.</li>
          <li>Transport section reserves the right to frame, revoke, amend, and enforce the rules and regulations which deem fit.</li>
          <li>Student <strong>cannot change the bus route</strong> without prior permission from the Transport section.</li>
          <li><strong>Bus Pass</strong> will be issued to the student after the payment. He/she must carry the bus pass and college ID card during transit.</li>
          <li>Duplicate bus pass will be issued with a fine of <strong className="highlight">Rs. 500/-</strong></li>
          <li>The bus pass holder must be the sole user of the pass — <strong>non-transferable</strong>.</li>
        </ul>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem' }}>Code of Conduct</h3>
        <ul>
          <li><strong>Not allowed</strong> inside the bus: Hooting, clapping, singing, loud talking or music (earphones permitted), celebrations, taking photos.</li>
          <li>Students must board the bus <strong>10 minutes before departure</strong>.</li>
          <li><strong>No food items</strong> of any form inside buses.</li>
          <li>Boys and girls should be seated <strong>separately</strong>. First few seats reserved for Girls, followed by faculty/staff, then boys.</li>
          <li>Misconduct/indiscipline may result in <strong>denial of transport facility</strong>.</li>
        </ul>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem' }}>Refund Policy</h3>
        <table className="dates-table">
          <thead>
            <tr><th>Period</th><th>Refund</th></tr>
          </thead>
          <tbody>
            <tr><td>0 – 3 Months</td><td><strong style={{ color: 'var(--accent-emerald)' }}>75% refundable</strong></td></tr>
            <tr><td>4 – 6 Months</td><td><strong style={{ color: 'var(--accent-amber)' }}>50% refundable</strong></td></tr>
            <tr><td>7 – 9 Months</td><td><strong style={{ color: 'var(--accent-rose)' }}>25% refundable</strong></td></tr>
            <tr><td>10 – 12 Months</td><td><strong style={{ color: 'var(--text-muted)' }}>Nil</strong></td></tr>
          </tbody>
        </table>

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', borderLeft: '3px solid var(--accent-amber)' }}>
          <p style={{ fontWeight: 600, color: 'var(--accent-amber)' }}>Contact Email:</p>
          <p>transport@psgitech.ac.in</p>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="checkbox-group" onClick={() => setAccepted(!accepted)}>
          <input type="checkbox" checked={accepted} onChange={() => setAccepted(!accepted)} />
          <label>I have read, understood, and agree to the instructions & undertaking for transport facility</label>
        </div>
      </div>
    </div>
  )
}
