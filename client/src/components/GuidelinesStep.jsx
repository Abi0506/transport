export default function GuidelinesStep({ accepted, setAccepted }) {
  return (
    <div className="slide-up">
      <div className="doc-viewer">
        <h2>📋 Guidelines for Registration — AY 2026–27</h2>
        <p><strong>3TL</strong> is the application developed for bus transport registration.</p>
        <p><strong>Registration Period:</strong></p>
        <ul>
          <li>15 May 2026 to 26 Jun 2026 — <strong>Seniors (2nd–5th year)</strong></li>
          <li>1 Jul 2026 to 31 Jul 2026 — <strong>FIRST year only</strong></li>
        </ul>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem' }}>1. Guidelines for Registering</h3>
        <ul>
          <li>Registration in the App is essential for Students (Day scholar), Staff (Teaching/Non-teaching) and all those willing to avail college bus facility.</li>
          <li>After registration you will receive a confirmation message to your mail along with the login credentials.</li>
          <li><span className="highlight">Registration alone does not guarantee the confirmation of seat in college bus.</span></li>
          <li>The <strong>BOARDING POINT</strong> of all the bus routes are fixed. Choose the Boarding point which is <strong>farther away from the college</strong>.</li>
          <li>Allocated seat will be confirmed only on paying the annual bus fees. If the payment is not done before the deadline, the allocated seat will be deallocated.</li>
          <li>Suggestions for NEW bus route can be given in the App.</li>
        </ul>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem' }}>2. Norms for the Allocation of Seats (Phase I & II)</h3>
        <ul>
          <li><strong>85%</strong> of total seats reserved for students.</li>
          <li><strong>9%</strong> reserved for teaching faculty and <strong>6%</strong> for non-teaching staff.</li>
          <li>Phase I registration: (2nd to 5th) year students, faculty and staff of PSG iTech and PSG IAP.</li>
          <li>Phase I seat allocation will be completed tentatively before 2nd week of July 2026.</li>
        </ul>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem' }}>Allocation Criteria:</h3>
        <ul>
          <li><strong>Students:</strong> Distance between college and boarding point. Students commuting from longer distance get first priority irrespective of year of study.</li>
          <li><strong>Faculty (Teaching):</strong> Senior faculty given first preference (irrespective of boarding point) followed by distance.</li>
          <li><strong>Staff (Non-Teaching):</strong> Senior staff given first preference followed by distance.</li>
        </ul>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem' }}>3. Payment</h3>
        <ul>
          <li><strong>Students:</strong> An amount of <strong>₹5,000</strong> in cash has to paid at the office before registering on this website. The advance amount is <strong>refundable</strong>.</li>
          <li><strong>Faculty (Teaching) & Staff (Non-Teaching):</strong> No advance payment required.</li>
          <li>Annual bus fees to be paid in the accounts section at E1 block ground floor 102 on or before <strong>10 Jul 2026</strong> (Friday).</li>
          <li>If annual bus fee is not paid within the time period, the allotted seat will be deallocated.</li>
          <li>Phase II: Exclusively for FIRST year students. Allocation by 1st week of August 2026.</li>
        </ul>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.1rem' }}>Contact</h3>
        <ul>
          <li>Email: transport.psgitech@gmail.com</li>
        </ul>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="checkbox-group" onClick={() => setAccepted(!accepted)}>
          <input type="checkbox" checked={accepted} onChange={() => setAccepted(!accepted)} />
          <label>I have read and understood all the guidelines for transport registration</label>
        </div>
      </div>
    </div>
  )
}
