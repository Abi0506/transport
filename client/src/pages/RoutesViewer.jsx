export default function RoutesViewer() {
  return (
    <div className="page fade-in" style={{ paddingTop: '1rem' }}>
      <div className="card" style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <h1 style={{ fontSize: 'clamp(1.3rem, 4vw, 2rem)' }}>Tentative Routes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>View the route sheet here. Use the browser controls if you want to download it later.</p>
        </div>

        <div style={{ width: '100%', height: '80vh', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
          <object data="/Tentative_Routes.pdf" type="application/pdf" width="100%" height="100%">
            <iframe
              src="/Tentative_Routes.pdf"
              title="Tentative Routes PDF"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          </object>
        </div>
      </div>
    </div>
  )
}