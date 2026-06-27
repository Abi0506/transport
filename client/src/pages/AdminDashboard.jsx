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
  const [activeTab, setActiveTab] = useState('operations')
  const [expandedRoute, setExpandedRoute] = useState(null)
  const [modal, setModal] = useState(null) // { stopName, routeId, registrations }
  const [toast, setToast] = useState(null)
  const [swapData, setSwapData] = useState({ stopName: '', fromRouteId: '', toRouteId: '' })
  const [bulkRolls, setBulkRolls] = useState('')
  const [bulkParseErrors, setBulkParseErrors] = useState([])
  const [paymentTab, setPaymentTab] = useState('manual')
  const [manualRoll, setManualRoll] = useState('')
  const [advancePayments, setAdvancePayments] = useState([])
  const [advancePaymentSearch, setAdvancePaymentSearch] = useState('')
  const [loadingAdvancePayments, setLoadingAdvancePayments] = useState(false)
  const [editingAdvancePayment, setEditingAdvancePayment] = useState(null)
  const [allocMode, setAllocMode] = useState('all')
  const [allocRoute, setAllocRoute] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterView, setFilterView] = useState('registered')
  const [filterAdvancePaid, setFilterAdvancePaid] = useState('')
  const [filterFinalPaid, setFilterFinalPaid] = useState('')
  const [filterRoute, setFilterRoute] = useState('')
  const [filteredRegs, setFilteredRegs] = useState([])
  const [routeViewRoute, setRouteViewRoute] = useState('')
  const [routeViewType, setRouteViewType] = useState('allocated')
  const [routeViewData, setRouteViewData] = useState([])
  const [selectedCommuterId, setSelectedCommuterId] = useState(null)
  const sortedRoutes = [...routes].sort((a, b) => a.routeName.localeCompare(b.routeName, undefined, { numeric: true, sensitivity: 'base' }))
  const totalRegistrations = stats?.totalRegistrations || 0
  const globalFacultyPercent = totalRegistrations ? Math.round(((stats?.facultyCount || 0) / totalRegistrations) * 100) : 0
  const globalStaffPercent = totalRegistrations ? Math.round(((stats?.staffCount || 0) / totalRegistrations) * 100) : 0
  const globalStudentPercent = totalRegistrations ? Math.round(((stats?.studentTotal || 0) / totalRegistrations) * 100) : 0
  const globalYearSplit = [1, 2, 3, 4, 5].map(year => {
    const count = stats?.studentsByYear?.[`year${year}`] || 0
    const percent = stats?.studentTotal ? Math.round((count / stats.studentTotal) * 100) : 0
    return { year, count, percent }
  })
  const adminTabs = [
    { id: 'operations', label: 'Operations' },
    { id: 'suggestions', label: 'Suggestions' },
    { id: 'payments', label: 'Advance & Final Payment' }
  ]

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
      setSelectedCommuterId(null)
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
  const [suggestionsModal, setSuggestionsModal] = useState(null)
  const [suggestionsList, setSuggestionsList] = useState([])
  const viewRefunds = async () => {
    try {
      const res = await api.get('/api/admin/registrations?status=rejected_refund&limit=1000')
      setRefundModal(res.data.registrations)
    } catch(err) { showToast('error', 'Failed to fetch refund candidates') }
  }

  const fetchSuggestions = async () => {
    try {
      const res = await api.get('/api/admin/suggestions')
      setSuggestionsList(res.data)
      setSuggestionsModal(true)
    } catch (err) { showToast('error', 'Failed to fetch suggestions') }
  }

  const downloadSuggestionsCSV = async () => {
    try {
      const res = await api.get('/api/admin/suggestions/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'suggestions.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) { showToast('error', 'Failed to download CSV') }
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
      loadAdvancePayments()
    } catch (err) { showToast('error', err.response?.data?.message || 'Failed') }
  }

  const bulkConfirm = async () => {
    const lines = bulkRolls.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    const entries = []
    const errors = []

    lines.forEach((line, index) => {
      const parts = line.split(',').map(s => s.trim()).filter(Boolean)
      if (parts.length === 0 || parts.length > 2) {
        errors.push(`Line ${index + 1}: use roll number or roll number,receipt number`)
        return
      }

      const [rollNumber, receiptNumber = ''] = parts
      if (!rollNumber) {
        errors.push(`Line ${index + 1}: roll number is required`)
        return
      }

      entries.push({ rollNumber, receiptNumber })
    })

    setBulkParseErrors(errors)
    if (!entries.length) return

    try {
      const res = await axios.post('/api/payment/bulk-confirm', { entries, confirmedBy: 'Admin' },
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } })
      showToast('success', res.data.message)
      setBulkRolls('')
      setBulkParseErrors([])
      loadAdvancePayments()
    } catch (err) { showToast('error', err.response?.data?.message || 'Failed') }
  }

  const loadAdvancePayments = async () => {
    setLoadingAdvancePayments(true)
    try {
      const params = new URLSearchParams({ status: 'confirmed', limit: '100' })
      if (advancePaymentSearch.trim()) {
        params.append('search', advancePaymentSearch.trim())
      }
      const res = await api.get(`/api/admin/payments?${params.toString()}`)
      setAdvancePayments(res.data || [])
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to load advance payments')
    } finally {
      setLoadingAdvancePayments(false)
    }
  }

  const saveAdvancePayment = async () => {
    if (!editingAdvancePayment) return
    try {
      const res = await api.put(`/api/admin/payments/${editingAdvancePayment._id}`, {
        name: editingAdvancePayment.name,
        rollNumber: editingAdvancePayment.rollNumber,
        receiptNumber: editingAdvancePayment.receiptNumber,
        paymentDate: editingAdvancePayment.paymentDate
      })
      showToast('success', res.data.message)
      setEditingAdvancePayment(null)
      loadAdvancePayments()
      fetchData()
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update advance payment')
    }
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

  const loadFilteredRegistrations = async () => {
    try {
      const params = new URLSearchParams({ view: filterView, limit: '500' })
      if (filterAdvancePaid) params.append('advancePaid', filterAdvancePaid)
      if (filterFinalPaid) params.append('fullFeePaid', filterFinalPaid)
      if (filterRoute) params.append('route', filterRoute)

      const res = await api.get(`/api/admin/registrations?${params.toString()}`)
      setFilteredRegs(res.data.registrations || [])
    } catch (err) {
      showToast('error', 'Failed to load filtered registrations')
    }
  }

  const loadRouteView = async () => {
    if (!routeViewRoute) {
      showToast('error', 'Select a route first')
      return
    }
    try {
      const res = await api.get(`/api/admin/route/${routeViewRoute}/view?view=${routeViewType}`)
      setRouteViewData(res.data || [])
    } catch (err) {
      showToast('error', 'Failed to load route-wise view')
    }
  }

  const moveToWaitlist = async (regId) => {
    try {
      const res = await api.post(`/api/admin/waitlist/${regId}`)
      showToast('success', res.data.message)
      loadFilteredRegistrations()
      loadRouteView()
      fetchData()
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to move user to waitlist')
    }
  }

  const deallocateUser = async (regId) => {
    const reason = window.prompt('Enter deallocation reason')
    if (reason === null) return
    try {
      const res = await api.post(`/api/admin/deallocate/${regId}`, { reason })
      showToast('success', res.data.message)
      loadFilteredRegistrations()
      loadRouteView()
      fetchData()
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to deallocate user')
    }
  }

  const resendMail = async (regId, type) => {
    try {
      const res = await api.post(`/api/admin/resend-mail/${regId}`, { type })
      showToast('success', res.data.message)
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to send mail')
    }
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

      <div className="admin-tab-bar">
        {adminTabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {stats && (
        <div className="card-grid cols-3" style={{ marginBottom: '1.5rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Global Split</h3>
            <div className="metric-list">
              <div><strong>Students</strong> {stats.studentTotal} ({globalStudentPercent}%)</div>
              <div><strong>Faculty</strong> {stats.facultyCount} ({globalFacultyPercent}%)</div>
              <div><strong>Staff</strong> {stats.staffCount} ({globalStaffPercent}%)</div>
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Year Split</h3>
            <div className="metric-list">
              {globalYearSplit.map(item => (
                <div key={item.year}>Y{item.year}: {item.count} ({item.percent}%)</div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: '0.75rem' }}>Quick View</h3>
            <div className="metric-list">
              <div><strong>Routes</strong> {stats.totalRoutes}</div>
              <div><strong>Seats Used</strong> {stats.allocatedCount}/{stats.totalCapacity}</div>
              <div><strong>Advance Paid</strong> {stats.paidCount}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'operations' && (
      <>
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
                {sortedRoutes.map(r => <option key={r._id} value={r._id}>{r.routeNumber} — {r.routeName}</option>)}
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
              {sortedRoutes.map(r => <option key={r._id} value={r._id}>{r.routeNumber} — {r.routeName}</option>)}
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

      <h2 style={{ margin: '0 0 1rem' }}>🗺️ Routes Overview</h2>
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

          <div style={{ padding: '0 1.5rem' }}>
            <div className="occupancy-bar">
              <div className="segment faculty" style={{ width: `${route.facultyPercent}%` }} />
              <div className="segment staff" style={{ width: `${route.staffPercent}%` }} />
              <div className="segment student" style={{ width: `${route.studentPercent}%` }} />
            </div>
            <div className="route-meta">
              <span><span className="dot" style={{ background: 'var(--accent-blue)' }} /> Faculty: {route.commuterSplit?.faculty?.count ?? route.facultyCount} ({route.commuterSplit?.faculty?.percentOfCapacity ?? route.facultyPercent}% seats, {route.commuterSplit?.faculty?.percentOfCommuters ?? 0}% commuters)</span>
              <span><span className="dot" style={{ background: 'var(--accent-purple)' }} /> Staff: {route.commuterSplit?.staff?.count ?? route.staffCount} ({route.commuterSplit?.staff?.percentOfCapacity ?? route.staffPercent}% seats, {route.commuterSplit?.staff?.percentOfCommuters ?? 0}% commuters)</span>
              <span><span className="dot" style={{ background: 'var(--accent-emerald)' }} /> Students: {route.commuterSplit?.students?.count ?? route.studentTotal} ({route.commuterSplit?.students?.percentOfCapacity ?? route.studentPercent}% seats, {route.commuterSplit?.students?.percentOfCommuters ?? 0}% commuters)</span>
            </div>
          </div>

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

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>📂 Registration Filters</h3>
        <div className="form-row">
          <div className="form-group">
            <label>View</label>
            <select className="form-control" value={filterView} onChange={e => setFilterView(e.target.value)}>
              <option value="registered">Registered</option>
              <option value="unregistered">Unregistered Advance Paid</option>
              <option value="allocated">Allocated</option>
              <option value="need-allocation">Need Allocation</option>
              <option value="deallocated">Deallocated</option>
            </select>
          </div>
          <div className="form-group">
            <label>Advance Payment</label>
            <select className="form-control" value={filterAdvancePaid} onChange={e => setFilterAdvancePaid(e.target.value)}>
              <option value="">All</option>
              <option value="true">Advance Paid</option>
              <option value="false">Advance Not Paid</option>
            </select>
          </div>
          <div className="form-group">
            <label>Final Payment</label>
            <select className="form-control" value={filterFinalPaid} onChange={e => setFilterFinalPaid(e.target.value)}>
              <option value="">All</option>
              <option value="true">Final Paid</option>
              <option value="false">Final Not Paid</option>
            </select>
          </div>
          <div className="form-group">
            <label>Route</label>
            <select className="form-control" value={filterRoute} onChange={e => setFilterRoute(e.target.value)}>
              <option value="">All Routes</option>
              {sortedRoutes.map(r => <option key={r._id} value={r._id}>{r.routeNumber} — {r.routeName}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={loadFilteredRegistrations}>Load Filtered Data</button>

        {filteredRegs.length > 0 && (
          <div style={{ marginTop: '1rem', maxHeight: '380px', overflowY: 'auto' }}>
            <table className="stop-table">
              <thead>
                <tr><th>Name</th><th>ID</th><th>Status</th><th>Advance</th><th>Final</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredRegs.map(reg => (
                  <tr key={reg._id}>
                    <td>{reg.name}</td>
                    <td>{reg.registerNumber || reg.employeeId}</td>
                    <td>{reg.registrationStatus}</td>
                    <td>{reg.advancePaid ? 'Yes' : 'No'}</td>
                    <td>{reg.fullFeePaid ? 'Yes' : 'No'}</td>
                    <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {reg.advancePaid && reg.registrationStatus !== 'allocated' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => moveToWaitlist(reg._id)}>Waitlist</button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => deallocateUser(reg._id)}>Deallocate</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => resendMail(reg._id, 'registration')}>Send Reg Mail</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => resendMail(reg._id, 'allocation')}>Send Alloc Mail</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => resendMail(reg._id, 'deallocation')}>Send Dealloc Mail</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* Suggestions */}
      {activeTab === 'suggestions' && (
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0 }}>📝 Route Suggestions</h3>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>View submissions or download the full list with submission date and route text.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={fetchSuggestions}
            style={{ minWidth: '220px', justifyContent: 'center' }}
          >
            📥 View Suggestions
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={downloadSuggestionsCSV}
            style={{ minWidth: '240px', justifyContent: 'center' }}
          >
            ⤓ Download Suggestions
          </button>
        </div>
      </div>
      )}

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
                      <a href={`https://sdc2.psgitech.ac.in/transportbackend2026/${c.cancellationLetter.split('\\').pop().split('/').pop()}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>View PDF</a>
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

      {activeTab === 'payments' && (
        <>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>💰 Payment Confirmation</h3>
            <div className="admin-subtabs">
              <button className={`btn ${paymentTab === 'manual' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setPaymentTab('manual')}>Manual Entry</button>
              <button className={`btn ${paymentTab === 'bulk' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setPaymentTab('bulk')}>Bulk Text</button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/office')}>Office Page</button>
            </div>
            {paymentTab === 'manual' ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input className="form-control" placeholder="Enter Roll Number" value={manualRoll} onChange={e => setManualRoll(e.target.value)} />
                <button className="btn btn-success" onClick={confirmPayment}>Confirm</button>
              </div>
            ) : paymentTab === 'bulk' ? (
              <div>
                <textarea className="form-control" rows={4} placeholder="Enter one entry per line: roll number or roll number,receipt number"
                  value={bulkRolls} onChange={e => setBulkRolls(e.target.value)} />
                {bulkParseErrors.length > 0 && (
                  <div style={{ marginTop: '0.75rem', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
                    {bulkParseErrors.map(error => (
                      <div key={error}>• {error}</div>
                    ))}
                  </div>
                )}
                <button className="btn btn-success" style={{ marginTop: '0.5rem' }} onClick={bulkConfirm}>Confirm All</button>
              </div>
            ) : null}
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ marginBottom: '0.35rem' }}>✏️ Advance Payment Editor</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>Update the receipt number, roll number, and payment date for confirmed advance payments.</p>
          </div>
          <button className="btn btn-primary" onClick={loadAdvancePayments} disabled={loadingAdvancePayments}>
            {loadingAdvancePayments ? 'Loading...' : 'Load Payments'}
          </button>
        </div>
        <div className="form-group" style={{ maxWidth: '360px' }}>
          <label>Search by roll number or receipt number</label>
          <input
            className="form-control"
            value={advancePaymentSearch}
            onChange={e => setAdvancePaymentSearch(e.target.value)}
            placeholder="Enter roll number or receipt number"
          />
        </div>
        {advancePayments.length > 0 && (
          <div style={{ maxHeight: '340px', overflowY: 'auto', marginTop: '1rem' }}>
            <table className="stop-table">
              <thead>
                <tr><th>Roll Number</th><th>Receipt #</th><th>Date</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {advancePayments.map(payment => (
                  <tr key={payment._id}>
                    <td>{payment.rollNumber}</td>
                    <td>{payment.receiptNumber}</td>
                    <td>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '—'}</td>
                    <td>{payment.paidStatus}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingAdvancePayment({
                          _id: payment._id,
                          rollNumber: payment.rollNumber || '',
                          receiptNumber: payment.receiptNumber || '',
                          paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : ''
                        })}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loadingAdvancePayments && advancePayments.length === 0 && (
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>No advance payments loaded.</p>
        )}
      </div>
        </>
      )}

      {false && (
      <>
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
                    Y{y}: {route.studentsByYear?.[`year${y}`] || 0} ({route.studentsByYearPercent?.[`year${y}`] || 0}%)
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
      </>
      )}

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
                      <td
                        style={{ fontWeight: 600, cursor: 'pointer', textDecoration: selectedCommuterId === reg._id ? 'underline' : 'none' }}
                        onClick={() => setSelectedCommuterId(selectedCommuterId === reg._id ? null : reg._id)}
                        title="Click to show mail options"
                      >
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
                          {reg.receiptFile ? <a href={`https://sdc2.psgitech.ac.in/transportbackend2026/${reg.receiptFile.split('\\').pop().split('/').pop()}`} target="_blank" rel="noreferrer" style={{color:'var(--accent-blue)', textDecoration: 'underline'}}>Adv</a> : <span style={{color:'var(--text-muted)'}}>No Adv</span>}
                        </div>
                        <div>
                          {reg.finalReceiptFile ? <a href={`https://sdc2.psgitech.ac.in/transportbackend2026/${reg.finalReceiptFile.split('\\').pop().split('/').pop()}`} target="_blank" rel="noreferrer" style={{color:'var(--accent-emerald)', textDecoration: 'underline'}}>Final</a> : <span style={{color:'var(--text-muted)'}}>No Final</span>}
                        </div>
                      </td>
                      <td>
                        {reg.registrationStatus === 'allocated' && !reg.isBlocked && (
                          <button className="btn btn-danger btn-sm" onClick={() => rejectAllocation(reg._id)}>Reject</button>
                        )}
                        <button className="btn btn-sm" style={{ marginLeft: '5px', background: reg.isBlocked ? 'var(--accent-emerald)' : 'var(--text-muted)', color: 'white', border: 'none' }} onClick={() => toggleBlock(reg._id, reg.isBlocked)}>
                          {reg.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                        {selectedCommuterId === reg._id && (
                          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => resendMail(reg._id, 'registration')}>Reg Mail</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => resendMail(reg._id, 'allocation')}>Alloc Mail</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => resendMail(reg._id, 'deallocation')}>Dealloc Mail</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {editingAdvancePayment && (
        <div className="modal-overlay" onClick={() => setEditingAdvancePayment(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h2>Edit Advance Payment</h2>
              <button className="modal-close" onClick={() => setEditingAdvancePayment(null)}>✕</button>
            </div>
            <div className="form-group">
              <label>Roll Number *</label>
              <input className="form-control" value={editingAdvancePayment.rollNumber} onChange={e => setEditingAdvancePayment({ ...editingAdvancePayment, rollNumber: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Receipt Number *</label>
              <input className="form-control" value={editingAdvancePayment.receiptNumber} onChange={e => setEditingAdvancePayment({ ...editingAdvancePayment, receiptNumber: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Date of Payment *</label>
              <input className="form-control" type="date" value={editingAdvancePayment.paymentDate} onChange={e => setEditingAdvancePayment({ ...editingAdvancePayment, paymentDate: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setEditingAdvancePayment(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveAdvancePayment}>Save Changes</button>
            </div>
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
      {suggestionsModal && (
        <div className="modal-overlay" onClick={() => setSuggestionsModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>📝 Route Suggestions ({suggestionsList.length})</h2>
              <button className="modal-close" onClick={() => setSuggestionsModal(null)}>✕</button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {suggestionsList.length === 0 ? (
                <p style={{ padding: '1rem' }}>No suggestions found.</p>
              ) : (
                <table className="stop-table">
                  <thead>
                    <tr><th>Reg/ID</th><th>Email</th><th>Route Suggestion</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {suggestionsList.map(s => (
                      <tr key={s._id}>
                        <td style={{ fontFamily: 'monospace' }}>{s.registerNumber}</td>
                        <td>{s.mailId}</td>
                        <td style={{ maxWidth: '420px', whiteSpace: 'pre-wrap' }}>{s.routeSuggestion}</td>
                        <td>{new Date(s.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setSuggestionsModal(null)}>Close</button>
              <button className="btn btn-primary" onClick={downloadSuggestionsCSV}>Download CSV</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
