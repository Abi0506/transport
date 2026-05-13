import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const api = axios.create()
api.interceptors.request.use(cfg => {
  cfg.headers.Authorization = `Bearer ${localStorage.getItem('adminToken')}`
  return cfg
})

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [routes, setRoutes] = useState([])
  const [expandedRoute, setExpandedRoute] = useState(null)
  const [modal, setModal] = useState(null) // { stopName, routeId, registrations }
  const [toast, setToast] = useState(null)
  const [swapData, setSwapData] = useState({ stopName: '', fromRouteId: '', toRouteId: '' })
  const [bulkRolls, setBulkRolls] = useState('')
  const [paymentTab, setPaymentTab] = useState('manual')
  const [manualRoll, setManualRoll] = useState('')
  const [allocMode, setAllocMode] = useState('all')
  const [allocRoute, setAllocRoute] = useState('')
  const [loading, setLoading] = useState(true)

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000) }

  const fetchData = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([api.get('/api/admin/stats'), api.get('/api/admin/routes')])
      setStats(s.data)
      setRoutes(r.data)
      setLoading(false)
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) navigate('/admin')
    }
  }, [navigate])

  const [allocResult, setAllocResult] = useState(null)
  const [cancellations, setCancellations] = useState([])

  const fetchCancellations = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/cancellations')
      setCancellations(res.data)
    } catch(err) {}
  }, [])

  useEffect(() => { fetchData(); fetchCancellations(); }, [fetchData, fetchCancellations])

  const viewStopPeople = async (routeId, stopName) => {
    try {
      const res = await api.get(`/api/admin/route/${routeId}/stop/${encodeURIComponent(stopName)}/registrations`)
      setModal({ stopName, routeId, registrations: res.data })
    } catch { showToast('error', 'Failed to load registrations') }
  }

  const rejectAllocation = async (regId) => {
    if (!window.confirm('Reject this allocation?')) return
    try {
      await api.post(`/api/admin/reject/${regId}`)
      showToast('success', 'Allocation rejected')
      if (modal) viewStopPeople(modal.routeId, modal.stopName)
      fetchData()
    } catch { showToast('error', 'Reject failed') }
  }

  const handleAllocate = async () => {
    if (!window.confirm(`Run ${allocMode === 'all' ? 'full' : 'route-wise'} allocation?`)) return
    try {
      const body = allocMode === 'route' ? { mode: 'route', routeId: allocRoute } : { mode: 'all' }
      const res = await api.post('/api/admin/allocate', body)
      setAllocResult(res.data.results)
      showToast('success', res.data.message)
      fetchData()
    } catch (err) { showToast('error', err.response?.data?.message || 'Allocation failed') }
  }

  const handleDeallocateUnpaid = async () => {
    if (!window.confirm('This will deallocate all users who have an allocated seat but HAVE NOT paid the advance. Proceed?')) return;
    try {
      const res = await api.post('/api/admin/deallocate-unpaid')
      showToast('success', res.data.message)
      fetchData()
    } catch(err) { showToast('error', err.response?.data?.message || 'Failed') }
  }

  const handleRejectUnallocated = async () => {
    if (!window.confirm('This will mark all paid users who did not get a seat as Rejected/Refunded. Proceed?')) return;
    try {
      const res = await api.post('/api/admin/reject-unallocated')
      showToast('success', res.data.message)
      fetchData()
    } catch(err) { showToast('error', err.response?.data?.message || 'Failed') }
  }

  const [refundModal, setRefundModal] = useState(null)
  const viewRefunds = async () => {
    try {
      const res = await api.get('/api/admin/registrations?status=rejected_refund&limit=1000')
      setRefundModal(res.data.registrations)
    } catch(err) { showToast('error', 'Failed to fetch refund candidates') }
  }

  const handleSwap = async () => {
    if (!swapData.stopName || !swapData.fromRouteId || !swapData.toRouteId) {
      showToast('error', 'Select stop, source route, and target route'); return
    }
    try {
      const res = await api.post('/api/admin/swap-stop', swapData)
      showToast('success', res.data.message)
      setSwapData({ stopName: '', fromRouteId: '', toRouteId: '' })
      fetchData()
    } catch (err) { showToast('error', err.response?.data?.message || 'Swap failed') }
  }

  const confirmPayment = async () => {
    if (!manualRoll) return
    try {
      await api.post('/api/payment/confirm-manual', { rollNumber: manualRoll, confirmedBy: 'Admin' })
      showToast('success', `Payment confirmed for ${manualRoll}`)
      setManualRoll('')
    } catch (err) { showToast('error', err.response?.data?.message || 'Failed') }
  }

  const bulkConfirm = async () => {
    const rolls = bulkRolls.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)
    if (!rolls.length) return
    try {
      const res = await axios.post('/api/payment/bulk-confirm', { rollNumbers: rolls, confirmedBy: 'Admin' },
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } })
      showToast('success', res.data.message)
      setBulkRolls('')
    } catch (err) { showToast('error', err.response?.data?.message || 'Failed') }
  }

  const [excelFile, setExcelFile] = useState(null)
  const handleExcelUpload = async (type) => {
    if (!excelFile) { showToast('error', 'Please select an Excel file first'); return; }
    const formData = new FormData()
    formData.append('file', excelFile)
    try {
      const res = await api.post(`/api/payment/upload-excel/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      showToast('success', res.data.message)
      setExcelFile(null)
      document.getElementById('adminExcelInput').value = ''
      fetchData()
    } catch(err) { showToast('error', err.response?.data?.message || 'Excel upload failed') }
  }

  const toggleBlock = async (regId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'unblock' : 'block'} this user?`)) return
    try {
      await api.post(`/api/admin/block/${regId}`)
      showToast('success', `User ${currentStatus ? 'unblocked' : 'blocked'} successfully`)
      if (modal) viewStopPeople(modal.routeId, modal.stopName)
      fetchData()
    } catch { showToast('error', 'Block action failed') }
  }

  const [editRoute, setEditRoute] = useState(null)
  const saveRouteStops = async () => {
    try {
      await api.put(`/api/admin/route/${editRoute._id}/stops`, { stops: editRoute.stops, capacity: editRoute.capacity })
      showToast('success', 'Route updated successfully')
      setEditRoute(null)
      fetchData()
    } catch { showToast('error', 'Failed to update route') }
  }

  const updateStopField = (index, field, value) => {
    const newStops = [...editRoute.stops]
    newStops[index] = { ...newStops[index], [field]: field === 'fees' || field === 'distanceOrder' ? Number(value) : value }
    setEditRoute({ ...editRoute, stops: newStops })
  }

  if (loading) return <div className="page" style={{ textAlign: 'center', paddingTop: '4rem' }}><h2>Loading Dashboard...</h2></div>

  return (
    <div className="page fade-in">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>🚌 Admin Dashboard</h1>
            <p>Transport Management — AY 2026–27</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => { localStorage.removeItem('adminToken'); navigate('/admin') }}>Logout</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="card stat-card blue"><div className="stat-value">{stats.totalRegistrations}</div><div className="stat-label">Total Registrations</div></div>
          <div className="card stat-card emerald"><div className="stat-value">{stats.allocatedCount}</div><div className="stat-label">Allocated</div></div>
          <div className="card stat-card amber"><div className="stat-value">{stats.pendingCount}</div><div className="stat-label">Pending</div></div>
          <div className="card stat-card purple"><div className="stat-value">{stats.paidCount}</div><div className="stat-label">Advance Paid</div></div>
          <div className="card stat-card rose"><div className="stat-value">{stats.totalCapacity}</div><div className="stat-label">Total Capacity</div></div>
        </div>
      )}

      {/* Allocation & Swap Controls */}
      <div className="card-grid cols-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>⚡ Seat Allocation</h3>
          <div className="form-group">
            <label>Mode</label>
            <select className="form-control" value={allocMode} onChange={e => setAllocMode(e.target.value)}>
              <option value="all">Allocate All Routes</option>
              <option value="route">Allocate Specific Route</option>
            </select>
          </div>
          {allocMode === 'route' && (
            <div className="form-group">
              <label>Select Route</label>
              <select className="form-control" value={allocRoute} onChange={e => setAllocRoute(e.target.value)}>
                <option value="">Select...</option>
                {routes.map(r => <option key={r._id} value={r._id}>{r.routeNumber} — {r.routeName}</option>)}
              </select>
            </div>
          )}
          <button className="btn btn-primary" onClick={handleAllocate}>🚀 Run Allocation</button>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-glass)' }}>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Bulk Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleDeallocateUnpaid} style={{ justifyContent: 'flex-start' }}>
                ⚠️ Deallocate Unpaid Users
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleRejectUnallocated} style={{ flex: 1, justifyContent: 'flex-start' }}>
                  💸 Reject Unallocated
                </button>
                <button className="btn btn-secondary btn-sm" onClick={viewRefunds} style={{ flex: 1, justifyContent: 'flex-start' }}>
                  👁️ View Refund Candidates
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>🔄 Swap Bus Stop</h3>
          <div className="form-group">
            <label>From Route</label>
            <select className="form-control" value={swapData.fromRouteId} onChange={e => setSwapData({ ...swapData, fromRouteId: e.target.value, stopName: '' })}>
              <option value="">Select source route...</option>
              {routes.map(r => <option key={r._id} value={r._id}>{r.routeNumber} — {r.routeName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Stop</label>
            <select className="form-control" value={swapData.stopName} onChange={e => setSwapData({ ...swapData, stopName: e.target.value })}>
              <option value="">Select stop...</option>
              {routes.find(r => r._id === swapData.fromRouteId)?.stops.map(s => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>To Route</label>
            <select className="form-control" value={swapData.toRouteId} onChange={e => setSwapData({ ...swapData, toRouteId: e.target.value })}>
              <option value="">Select target route...</option>
              {routes.filter(r => r._id !== swapData.fromRouteId).map(r => (
                <option key={r._id} value={r._id}>{r.routeNumber} — {r.routeName}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-secondary" onClick={handleSwap}>Move Stop →</button>
        </div>
      </div>

      {/* Cancellations */}
      {cancellations.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--accent-rose)' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--accent-rose)' }}>⚠️ Pending Cancellation Requests ({cancellations.length})</h3>
          <table className="stop-table">
            <thead>
              <tr><th>Name</th><th>ID</th><th>Reason</th><th>Document</th><th>Action</th></tr>
            </thead>
            <tbody>
              {cancellations.map(c => (
                <tr key={c._id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.registerNumber || c.employeeId}</td>
                  <td style={{ maxWidth: '300px' }}>{c.cancellationReason}</td>
                  <td>
                    {c.cancellationLetter ? (
                      <a href={`http://localhost:5000/${c.cancellationLetter.split('\\').pop().split('/').pop()}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>View PDF</a>
                    ) : 'None'}
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={async () => {
                      if (!window.confirm('Approve this cancellation?')) return;
                      try {
                        await api.post(`/api/admin/approve-cancellation/${c._id}`)
                        showToast('success', 'Cancellation approved')
                        fetchCancellations()
                        fetchData()
                      } catch(err) { showToast('error', 'Failed') }
                    }}>Approve</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Confirmation */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>💰 Payment Confirmation</h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button className={`btn ${paymentTab === 'manual' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setPaymentTab('manual')}>Manual Entry</button>
          <button className={`btn ${paymentTab === 'bulk' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setPaymentTab('bulk')}>Bulk Text</button>
          <button className={`btn ${paymentTab === 'excel' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setPaymentTab('excel')}>Excel Upload</button>
        </div>
        {paymentTab === 'manual' ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="form-control" placeholder="Enter Roll Number" value={manualRoll} onChange={e => setManualRoll(e.target.value)} />
            <button className="btn btn-success" onClick={confirmPayment}>Confirm</button>
          </div>
        ) : paymentTab === 'bulk' ? (
          <div>
            <textarea className="form-control" rows={4} placeholder="Enter roll numbers (one per line, or comma-separated)"
              value={bulkRolls} onChange={e => setBulkRolls(e.target.value)} />
            <button className="btn btn-success" style={{ marginTop: '0.5rem' }} onClick={bulkConfirm}>Confirm All</button>
          </div>
        ) : (
          <div>
            <input id="adminExcelInput" type="file" accept=".xlsx,.xls,.csv" className="form-control" onChange={e => setExcelFile(e.target.files[0])} />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button className="btn btn-primary" onClick={() => handleExcelUpload('advance')}>Verify Advance (Excel)</button>
              <button className="btn btn-success" onClick={() => handleExcelUpload('final')}>Verify Final Fee (Excel)</button>
            </div>
          </div>
        )}
      </div>

      {/* Route Cards */}
      <h2 style={{ marginBottom: '1rem' }}>🗺️ Routes Overview</h2>
      {routes.map(route => (
        <div key={route._id} className="card route-card">
          <div className="route-card-header" onClick={() => setExpandedRoute(expandedRoute === route._id ? null : route._id)}>
            <div style={{ flex: 1 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span><span style={{ color: 'var(--accent-blue)' }}>{route.routeNumber}</span> {route.routeName}</span>
                <span className={`route-badge ${route.occupancyPercent >= 90 ? 'full' : route.occupancyPercent >= 50 ? 'partial' : 'empty'}`}>
                  {route.occupancyPercent}% full
                </span>
                <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); setEditRoute(route) }}>Edit Stops</button>
              </h3>
            </div>
            <span style={{ color: 'var(--text-muted)', marginLeft: '1rem' }}>
              {route.totalRegistered}/{route.capacity} • {expandedRoute === route._id ? '▲' : '▼'}
            </span>
          </div>

          {/* Occupancy bar */}
          <div style={{ padding: '0 1.5rem' }}>
            <div className="occupancy-bar">
              <div className="segment faculty" style={{ width: `${route.facultyPercent}%` }} />
              <div className="segment staff" style={{ width: `${route.staffPercent}%` }} />
              <div className="segment student" style={{ width: `${route.studentPercent}%` }} />
            </div>
            <div className="route-meta">
              <span><span className="dot" style={{ background: 'var(--accent-blue)' }} /> Faculty: {route.facultyCount} ({route.facultyPercent}%)</span>
              <span><span className="dot" style={{ background: 'var(--accent-purple)' }} /> Staff: {route.staffCount} ({route.staffPercent}%)</span>
              <span><span className="dot" style={{ background: 'var(--accent-emerald)' }} /> Students: {route.studentTotal} ({route.studentPercent}%)</span>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600 }}>Year-wise Split:</span>
                {[1, 2, 3, 4, 5].map(y => (
                  <span key={y} style={{ color: 'var(--text-muted)' }}>
                    Y{y}: {route.studentsByYear?.[`year${y}`] || 0}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Expanded: Stop table */}
          {expandedRoute === route._id && (
            <div style={{ padding: '0 1.5rem 1.5rem' }}>
              <table className="stop-table">
                <thead>
                  <tr>
                    <th>Stop</th><th>Time</th><th>Fee</th><th>Total</th>
                    <th>Faculty</th><th>Staff</th><th>Students</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {route.stops.map(stop => (
                    <tr key={stop.name}>
                      <td style={{ fontWeight: 600 }}>{stop.name}</td>
                      <td>{stop.time}</td>
                      <td>₹{stop.fees.toLocaleString()}</td>
                      <td><strong>{stop.totalCount}</strong></td>
                      <td>{stop.facultyCount}</td>
                      <td>{stop.staffCount}</td>
                      <td>{stop.studentCount}</td>
                      <td><button className="view-btn" onClick={() => viewStopPeople(route._id, stop.name)}>View People</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* Modal: Edit Stops */}
      {editRoute && (
        <div className="modal-overlay" onClick={() => setEditRoute(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>Edit Stops — {editRoute.routeNumber}</h2>
              <button className="modal-close" onClick={() => setEditRoute(null)}>✕</button>
            </div>
            
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ fontWeight: 600 }}>Route Capacity:</label>
              <input className="form-control" type="number" style={{ width: '120px' }} 
                value={editRoute.capacity || 0} 
                onChange={e => setEditRoute({ ...editRoute, capacity: Number(e.target.value) })} />
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: '1.5rem' }}>
              {editRoute.stops.map((stop, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input className="form-control" value={stop.name} onChange={e => updateStopField(idx, 'name', e.target.value)} placeholder="Stop Name" />
                  <input className="form-control" value={stop.time} onChange={e => updateStopField(idx, 'time', e.target.value)} placeholder="Time" />
                  <input className="form-control" type="number" value={stop.fees} onChange={e => updateStopField(idx, 'fees', e.target.value)} placeholder="Fees" />
                  <input className="form-control" type="number" value={stop.distanceOrder} onChange={e => updateStopField(idx, 'distanceOrder', e.target.value)} placeholder="Order" />
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={() => setEditRoute({ ...editRoute, stops: [...editRoute.stops, { name: '', time: '', fees: 0, distanceOrder: editRoute.stops.length + 1 }] })}>+ Add Stop</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setEditRoute(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveRouteStops}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Stop registrations */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📍 {modal.stopName} — Registrations ({modal.registrations.length})</h2>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            {modal.registrations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No registrations for this stop</p>
            ) : (
              <table className="stop-table">
                <thead>
                  <tr><th>Name</th><th>ID</th><th>Type</th><th>Year</th><th>Status</th><th>Slips</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {modal.registrations.map(reg => (
                    <tr key={reg._id} style={{ opacity: reg.isBlocked ? 0.5 : 1 }}>
                      <td style={{ fontWeight: 600 }}>
                        {reg.name} {reg.isBlocked && <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem', fontWeight: 700 }}>[BLOCKED]</span>}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{reg.registerNumber || reg.employeeId}</td>
                      <td><span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700,
                        background: reg.userType === 'faculty' ? 'rgba(59,130,246,0.15)' : reg.userType === 'staff' ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)',
                        color: reg.userType === 'faculty' ? 'var(--accent-blue)' : reg.userType === 'staff' ? 'var(--accent-purple)' : 'var(--accent-emerald)'
                      }}>{reg.userType}</span></td>
                      <td>{reg.academicYear || '—'}</td>
                      <td><span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700,
                        background: reg.registrationStatus === 'allocated' ? 'rgba(16,185,129,0.15)' : reg.registrationStatus === 'rejected' || reg.registrationStatus.includes('rejected') ? 'rgba(244,63,94,0.15)' : 'rgba(245,158,11,0.15)',
                        color: reg.registrationStatus === 'allocated' ? 'var(--accent-emerald)' : reg.registrationStatus === 'rejected' || reg.registrationStatus.includes('rejected') ? 'var(--accent-rose)' : 'var(--accent-amber)'
                      }}>{reg.registrationStatus}</span></td>
                      <td style={{ fontSize: '0.8rem' }}>
                        <div style={{ marginBottom: '4px' }}>
                          {reg.receiptFile ? <a href={`http://localhost:5000/${reg.receiptFile.split('\\').pop().split('/').pop()}`} target="_blank" rel="noreferrer" style={{color:'var(--accent-blue)', textDecoration: 'underline'}}>Adv</a> : <span style={{color:'var(--text-muted)'}}>No Adv</span>}
                        </div>
                        <div>
                          {reg.finalReceiptFile ? <a href={`http://localhost:5000/${reg.finalReceiptFile.split('\\').pop().split('/').pop()}`} target="_blank" rel="noreferrer" style={{color:'var(--accent-emerald)', textDecoration: 'underline'}}>Final</a> : <span style={{color:'var(--text-muted)'}}>No Final</span>}
                        </div>
                      </td>
                      <td>
                        {reg.registrationStatus === 'allocated' && !reg.isBlocked && (
                          <button className="btn btn-danger btn-sm" onClick={() => rejectAllocation(reg._id)}>Reject</button>
                        )}
                        <button className="btn btn-sm" style={{ marginLeft: '5px', background: reg.isBlocked ? 'var(--accent-emerald)' : 'var(--text-muted)', color: 'white', border: 'none' }} onClick={() => toggleBlock(reg._id, reg.isBlocked)}>
                          {reg.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      {/* Modal: Allocation Result */}
      {allocResult && (
        <div className="modal-overlay" onClick={() => setAllocResult(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Allocation Results</h2>
              <button className="modal-close" onClick={() => setAllocResult(null)}>✕</button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {allocResult.map((r, i) => (
                <div key={i} style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                  <h4 style={{ color: 'var(--accent-blue)', marginBottom: '0.5rem' }}>Route {r.route}: {r.routeName}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <div>Capacity: {r.capacity}</div>
                    <div>Previously Allocated: {r.previouslyAllocated}</div>
                    <div style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>Newly Allocated: {Object.values(r.newlyAllocated).reduce((a,b)=>a+b, 0)}</div>
                    <div style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>Not Allocated (Pending): {r.notAllocated}</div>
                    <div>Remaining Seats: {r.remainingSeats}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Modal: Refund Candidates */}
      {refundModal && (
        <div className="modal-overlay" onClick={() => setRefundModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>💸 Refund Candidates</h2>
              <button className="modal-close" onClick={() => setRefundModal(null)}>✕</button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {refundModal.length === 0 ? (
                <p>No refund candidates found.</p>
              ) : (
                <table className="stop-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>ID</th>
                      <th>Requested Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundModal.map(r => (
                      <tr key={r._id}>
                        <td>{r.name}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.userType}</td>
                        <td>{r.registerNumber || r.employeeId}</td>
                        <td>{r.boardingPointRoute?.routeName || 'Unknown'} — {r.boardingPoint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
