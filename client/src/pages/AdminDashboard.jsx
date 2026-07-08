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
  
  // Custom Email Center States
  const [emailConfig, setEmailConfig] = useState({
    recipientGroup: 'all',
    routeId: '',
    commuterId: '',
    fromMonth: 'June',
    toMonth: 'April',
    deadline: '05.08.2025',
    venue: 'iTech Office, E1 block Ground floor, Room No 102',
    modeOfPayment: 'Cash / DD (Favoring: The Principal, PSG Institute of Technology and Applied Research, Payable at Coimbatore)'
  })
  const [sendingEmails, setSendingEmails] = useState(false)
  const [previewType, setPreviewType] = useState('student')

  const [commuterSearch, setCommuterSearch] = useState('')
  const [commuterRouteFilter, setCommuterRouteFilter] = useState('')
  const [commuterStopFilter, setCommuterStopFilter] = useState('')
  const [commuterAllocFilter, setCommuterAllocFilter] = useState('all') // 'all', 'allocated', 'unallocated'
  const [commuterPaidFilter, setCommuterPaidFilter] = useState('all')   // 'all', 'paid', 'not-paid'
  const [commuterList, setCommuterList] = useState([])
  const [loadingCommuters, setLoadingCommuters] = useState(false)
  const [manualAllocTarget, setManualAllocTarget] = useState(null) // { registration, routeId, stopName }

  const [editSearch, setEditSearch] = useState('')
  const [editRouteFilter, setEditRouteFilter] = useState('')
  const [editUserTypeFilter, setEditUserTypeFilter] = useState('')
  const [editCommutersList, setEditCommutersList] = useState([])
  const [loadingEditCommuters, setLoadingEditCommuters] = useState(false)
  const [editingCommuter, setEditingCommuter] = useState(null) // registration object currently being edited

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
    { id: 'edit_directory', label: '✏️ Edit Directory' },
    { id: 'suggestions', label: 'Suggestions' },
    { id: 'payments', label: 'Advance & Final Payment' },
    { id: 'emails', label: 'Email Center' }
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
    const confirmation = window.prompt("To run overall allocation, type 'ALLOCATE ALL' to confirm:")
    if (confirmation !== 'ALLOCATE ALL') {
      showToast('error', 'Allocation cancelled. Confirmation text did not match.')
      return
    }
    try {
      const res = await api.post('/api/admin/allocate', { mode: 'all' })
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
    if (!window.confirm('Are you sure you want to deallocate this commuter?')) return
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
    if (!window.confirm(`Are you sure you want to send the ${type} email to this commuter?`)) return
    try {
      const payload = { type }
      if (type === 'allocation') {
        payload.fromMonth = emailConfig.fromMonth
        payload.toMonth = emailConfig.toMonth
        payload.deadline = emailConfig.deadline
        payload.venue = emailConfig.venue
        payload.modeOfPayment = emailConfig.modeOfPayment
      }
      const res = await api.post(`/api/admin/resend-mail/${regId}`, payload)
      showToast('success', res.data.message)
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to send mail')
    }
  }

  const sendBulkEmails = async () => {
    const isIndividual = emailConfig.commuterId && emailConfig.commuterId.trim()
    const confirmMsg = isIndividual 
      ? `Send allocation email to commuter "${emailConfig.commuterId.trim()}"?`
      : `Are you sure you want to send allocation emails to the selected group? This may take some time.`
    if (!window.confirm(confirmMsg)) return
    setSendingEmails(true)
    try {
      const res = await api.post('/api/admin/send-bulk-emails', {
        userType: emailConfig.recipientGroup,
        routeId: emailConfig.routeId,
        commuterId: emailConfig.commuterId,
        fromMonth: emailConfig.fromMonth,
        toMonth: emailConfig.toMonth,
        deadline: emailConfig.deadline,
        venue: emailConfig.venue,
        modeOfPayment: emailConfig.modeOfPayment
      })
      showToast('success', res.data.message)
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to send emails')
    } finally {
      setSendingEmails(false)
    }
  }

  const fetchCommuterList = useCallback(async () => {
    setLoadingCommuters(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (commuterSearch.trim()) params.append('search', commuterSearch.trim())
      if (commuterRouteFilter) params.append('route', commuterRouteFilter)
      if (commuterStopFilter) params.append('boardingPoint', commuterStopFilter)
      
      if (commuterAllocFilter === 'allocated') {
        params.append('status', 'allocated')
      } else if (commuterAllocFilter === 'unallocated') {
        params.append('view', 'need-allocation')
      } else if (commuterAllocFilter === 'deallocated') {
        params.append('status', 'deallocated')
      } else if (commuterAllocFilter === 'cancelled') {
        params.append('status', 'cancelled')
      }

      if (commuterPaidFilter === 'paid') {
        params.append('advancePaid', 'true')
      } else if (commuterPaidFilter === 'not-paid') {
        params.append('advancePaid', 'false')
      }

      const res = await api.get(`/api/admin/registrations?${params.toString()}`)
      setCommuterList(res.data.registrations || [])
    } catch {
      showToast('error', 'Failed to load commuters list')
    } finally {
      setLoadingCommuters(false)
    }
  }, [commuterSearch, commuterRouteFilter, commuterStopFilter, commuterAllocFilter, commuterPaidFilter])

  const allocateIndividualCommuter = async (regId, routeId, stopName) => {
    if (!window.confirm('Are you sure you want to allocate this commuter?')) return
    try {
      const res = await api.post(`/api/admin/allocate-individual/${regId}`, { routeId, stopName })
      showToast('success', res.data.message)
      setManualAllocTarget(null)
      fetchCommuterList()
      fetchData()
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to allocate commuter')
    }
  }

  const fetchEditCommutersList = async () => {
    setLoadingEditCommuters(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (editSearch.trim()) params.append('search', editSearch.trim())
      if (editRouteFilter) params.append('route', editRouteFilter)
      if (editUserTypeFilter) params.append('userType', editUserTypeFilter)
      const res = await api.get(`/api/admin/registrations?${params.toString()}`)
      setEditCommutersList(res.data.registrations || [])
    } catch {
      showToast('error', 'Failed to load commuters')
    } finally {
      setLoadingEditCommuters(false)
    }
  }

  const saveCommuterDetails = async () => {
    try {
      const res = await api.put(`/api/admin/registration/${editingCommuter._id}`, {
        name: editingCommuter.name,
        mailId: editingCommuter.mailId,
        registerNumber: editingCommuter.registerNumber,
        employeeId: editingCommuter.employeeId,
        userType: editingCommuter.userType,
        academicYear: editingCommuter.academicYear,
        boardingPoint: editingCommuter.boardingPoint
      })
      showToast('success', res.data.message)
      setEditingCommuter(null)
      fetchEditCommutersList()
      fetchData()
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update commuter details')
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
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: '1.4' }}>
              Run the overall seat allocation engine for all routes. Active commuters who have paid the advance and are not deallocated will be assigned seats.
            </p>
            <button className="btn btn-primary" onClick={handleAllocate}>🚀 Run Overall Allocation</button>
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
              {route.commuterSplit?.students?.byYear && (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem 0', marginTop: '0.25rem', borderTop: '1px solid var(--border-color)' }}>
                  <span>Year 1: <strong>{route.commuterSplit.students.byYear[1]}</strong> ({route.capacity ? Math.round((route.commuterSplit.students.byYear[1] / route.capacity) * 100) : 0}%)</span>
                  <span>Year 2: <strong>{route.commuterSplit.students.byYear[2]}</strong> ({route.capacity ? Math.round((route.commuterSplit.students.byYear[2] / route.capacity) * 100) : 0}%)</span>
                  <span>Year 3: <strong>{route.commuterSplit.students.byYear[3]}</strong> ({route.capacity ? Math.round((route.commuterSplit.students.byYear[3] / route.capacity) * 100) : 0}%)</span>
                  <span>Year 4: <strong>{route.commuterSplit.students.byYear[4]}</strong> ({route.capacity ? Math.round((route.commuterSplit.students.byYear[4] / route.capacity) * 100) : 0}%)</span>
                  <span>Year 5: <strong>{route.commuterSplit.students.byYear[5]}</strong> ({route.capacity ? Math.round((route.commuterSplit.students.byYear[5] / route.capacity) * 100) : 0}%)</span>
                </div>
              )}
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

        {/* Commuter Management Section */}
        <div className="card" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔍 Commuter Directory & Seat Manager
          </h3>

          {/* Filter Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Search Commuter</label>
              <input className="form-control" value={commuterSearch} onChange={e => setCommuterSearch(e.target.value)} placeholder="Search name, roll #, email..." />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Route Filter</label>
              <select className="form-control" value={commuterRouteFilter} onChange={e => { setCommuterRouteFilter(e.target.value); setCommuterStopFilter('') }}>
                <option value="">All Routes</option>
                {sortedRoutes.map(r => <option key={r._id} value={r._id}>{r.routeNumber} — {r.routeName}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Bus Stop Filter</label>
              <select className="form-control" value={commuterStopFilter} onChange={e => setCommuterStopFilter(e.target.value)}>
                <option value="">All Stops</option>
                {commuterRouteFilter && routes.find(r => r._id === commuterRouteFilter)?.stops.map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Allocation Status</label>
              <select className="form-control" value={commuterAllocFilter} onChange={e => setCommuterAllocFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="allocated">Allocated</option>
                <option value="unallocated">Unallocated</option>
                <option value="deallocated">Deallocated</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Payment Status</label>
              <select className="form-control" value={commuterPaidFilter} onChange={e => setCommuterPaidFilter(e.target.value)}>
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="not-paid">Not Paid</option>
              </select>
            </div>
          </div>

          <button className="btn btn-primary" onClick={fetchCommuterList} disabled={loadingCommuters} style={{ marginBottom: '1.5rem' }}>
            {loadingCommuters ? 'Applying...' : '🔍 Apply Search & Filters'}
          </button>

          {/* Results List */}
          {loadingCommuters ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading commuters list...</p>
          ) : commuterList.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No commuters found matching filters.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="stop-table">
                <thead>
                  <tr>
                    <th>Commuter</th>
                    <th>Type/Year</th>
                    <th>Requested Stop</th>
                    <th>Allocation</th>
                    <th>Payment</th>
                    <th>Actions</th>
                    <th>Email Manager</th>
                  </tr>
                </thead>
                <tbody>
                  {commuterList.map(reg => {
                    const isAllocated = reg.registrationStatus === 'allocated';
                    const bpRouteId = reg.boardingPointRoute?._id || reg.boardingPointRoute;
                    const allocRouteId = reg.allocatedRoute?._id || reg.allocatedRoute;
                    const requestedRouteObj = sortedRoutes.find(r => r._id === bpRouteId);
                    const allocatedRouteObj = sortedRoutes.find(r => r._id === allocRouteId);
                    
                    return (
                      <tr key={reg._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{reg.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{reg.registerNumber || reg.employeeId}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>{reg.userType}</div>
                          {reg.userType === 'student' && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Year {reg.academicYear}</div>}
                        </td>
                        <td>
                          <div>{reg.boardingPoint}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{requestedRouteObj ? `Route ${requestedRouteObj.routeNumber} — ${requestedRouteObj.routeName}` : 'No requested route'}</div>
                        </td>
                        <td>
                          {isAllocated ? (
                            <div style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                              Route {allocatedRouteObj?.routeNumber || 'N/A'} — {reg.allocatedStop || 'N/A'}
                            </div>
                          ) : (reg.registrationStatus === 'deallocated' || reg.registrationStatus === 'rejected' || reg.registrationStatus === 'cancelled') ? (
                            <div style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>
                              Deallocated
                            </div>
                          ) : (
                            <div style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
                              Unallocated
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                            background: 'rgba(244,63,94,0.15)',
                            color: 'var(--accent-rose)'
                          }}>Unpaid</span>
                        </td>
                        <td style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn"
                            disabled={isAllocated}
                            style={{
                              background: isAllocated ? '#9ca3af' : '#16a34a',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: isAllocated ? 'not-allowed' : 'pointer',
                              fontWeight: 'bold',
                              opacity: isAllocated ? 0.6 : 1
                            }}
                            onClick={() => setManualAllocTarget({
                              registration: reg,
                              routeId: reg.boardingPointRoute || '',
                              stopName: reg.boardingPoint || ''
                            })}
                          >
                            Allocate
                          </button>
                          <button
                            className="btn"
                            disabled={!isAllocated}
                            style={{
                              background: !isAllocated ? '#9ca3af' : '#dc2626',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: !isAllocated ? 'not-allowed' : 'pointer',
                              fontWeight: 'bold',
                              opacity: !isAllocated ? 0.6 : 1
                            }}
                            onClick={async () => {
                              await deallocateUser(reg._id);
                              fetchCommuterList();
                            }}
                          >
                            Deallocate
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <button className="btn" style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }} onClick={() => resendMail(reg._id, 'allocation')}>Send Alloc</button>
                            <button className="btn" style={{ background: '#ea580c', color: '#ffffff', border: 'none', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }} onClick={() => resendMail(reg._id, 'deallocation')}>Send Dealloc</button>
                            <button className="btn" style={{ background: '#be123c', color: '#ffffff', border: 'none', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }} onClick={() => resendMail(reg._id, 'unpaid')}>Send Unpaid</button>
                            <button className="btn" style={{ background: '#0d9488', color: '#ffffff', border: 'none', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }} onClick={() => resendMail(reg._id, 'paid')}>Send Paid</button>
                            <button className="btn" style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }} onClick={() => resendMail(reg._id, 'unallocated')}>Send Unalloc</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
      )}

      {/* Edit Directory Tab */}
      {activeTab === 'edit_directory' && (
        <div className="card fade-in" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ✏️ Commuter Directory Editor
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Search, filter, and edit contact and registration details for students, faculty, and staff. Note: Status and Payment flags are managed in the operations panel.
          </p>

          {/* Filter Form */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Search Commuter</label>
              <input className="form-control" value={editSearch} onChange={e => setEditSearch(e.target.value)} placeholder="Search name, roll #, email..." />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Route Filter</label>
              <select className="form-control" value={editRouteFilter} onChange={e => setEditRouteFilter(e.target.value)}>
                <option value="">All Routes</option>
                {sortedRoutes.map(r => <option key={r._id} value={r._id}>{r.routeNumber} — {r.routeName}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>User Type</label>
              <select className="form-control" value={editUserTypeFilter} onChange={e => setEditUserTypeFilter(e.target.value)}>
                <option value="">All Types</option>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </div>

          <button className="btn btn-primary" onClick={fetchEditCommutersList} disabled={loadingEditCommuters} style={{ marginBottom: '1.5rem' }}>
            {loadingEditCommuters ? 'Searching...' : '🔍 Search Commuters'}
          </button>

          {/* Results Table */}
          {loadingEditCommuters ? (
            <p style={{ color: 'var(--text-muted)' }}>Searching database...</p>
          ) : editCommutersList.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No commuters loaded. Please use the search bar above.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="stop-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID / Roll Number</th>
                    <th>Email</th>
                    <th>User Type</th>
                    <th>Academic Year</th>
                    <th>Boarding Point</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editCommutersList.map(reg => (
                    <tr key={reg._id}>
                      <td style={{ fontWeight: 600 }}>{reg.name}</td>
                      <td>{reg.registerNumber || reg.employeeId || '—'}</td>
                      <td>{reg.mailId}</td>
                      <td style={{ textTransform: 'capitalize' }}>{reg.userType}</td>
                      <td>{reg.academicYear || '—'}</td>
                      <td>{reg.boardingPoint}</td>
                      <td>
                        <button className="btn" style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setEditingCommuter({ ...reg })}>
                          ✏️ Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--accent-rose)' }}>⚠️ Pending Cancellation Requests - Advance Cancellation ({cancellations.length})</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Note: These cancellation requests are for the advance payment of ₹5,000 (fully refundable on or before September 10, 2026).</p>
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

      {activeTab === 'emails' && (
        <div className="card fade-in" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ✉️ Email Center
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Send detailed college bus seat allocation emails to allocated students, faculties, and staff.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
            {/* Form Column */}
            <div>
              <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Email Editor</h3>
              
              <div className="form-row" style={{ marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Duration - From Month</label>
                  <input className="form-control" value={emailConfig.fromMonth} onChange={e => setEmailConfig({ ...emailConfig, fromMonth: e.target.value })} placeholder="e.g., June" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontWeight: 600 }}>Duration - To Month</label>
                  <input className="form-control" value={emailConfig.toMonth} onChange={e => setEmailConfig({ ...emailConfig, toMonth: e.target.value })} placeholder="e.g., April" />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Payment Deadline Date</label>
                <input className="form-control" value={emailConfig.deadline} onChange={e => setEmailConfig({ ...emailConfig, deadline: e.target.value })} placeholder="e.g., 05.08.2025" />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Mode of Payment</label>
                <textarea className="form-control" rows={3} value={emailConfig.modeOfPayment} onChange={e => setEmailConfig({ ...emailConfig, modeOfPayment: e.target.value })} placeholder="Payment instructions..." />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Payment Venue</label>
                <input className="form-control" value={emailConfig.venue} onChange={e => setEmailConfig({ ...emailConfig, venue: e.target.value })} placeholder="e.g., iTech Office, E1 block Ground floor, Room No 102" />
              </div>
            </div>

            {/* Preview Column */}
            <div>
              <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Dynamic Previews</h3>
              
              <div className="admin-subtabs" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                <button className={`btn ${previewType === 'student' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setPreviewType('student')}>Student Template</button>
                <button className={`btn ${previewType === 'staff' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setPreviewType('staff')}>Faculty/Staff Template</button>
              </div>

              <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', background: '#fff', color: '#333', maxHeight: '550px', overflowY: 'auto', fontFamily: 'Arial, sans-serif' }}>
                {previewType === 'student' ? (
                  <div>
                    <h2 style={{ color: '#1d4ed8', textAlign: 'center', marginBottom: '5px', fontSize: '20px', fontWeight: 'bold' }}>Transport Section PSG iTech</h2>
                    <hr style={{ border: '0', borderTop: '1px solid #d1d5db', marginBottom: '15px' }} />
                    <p style={{ fontSize: '14px', margin: '0 0 10px 0' }}>Dear [Student Name],</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px 0' }}>Greetings of the Day !</p>
                    <p style={{ fontSize: '14px', lineHeight: '1.4', margin: '0 0 15px 0' }}>Transport section of PSGiTech is happy to <span style={{ backgroundColor: '#f59e0b', color: '#000', padding: '2px 5px', borderRadius: '3px', fontWeight: 'bold', fontSize: '12px' }}>ALLOCATE</span> you a seat in college bus based on your chosen boarding point.</p>
                    
                    <div style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '6px', padding: '12px', margin: '15px 0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <tbody>
                          <tr style={{ height: '24px' }}><td style={{ fontWeight: 'bold', width: '40%' }}>Bus Route:</td><td>[Allocated Route Number - Name]</td></tr>
                          <tr style={{ height: '24px' }}><td style={{ fontWeight: 'bold' }}>Boarding Point:</td><td>[Student Boarding Point]</td></tr>
                          <tr style={{ height: '24px' }}><td style={{ fontWeight: 'bold' }}>Duration:</td><td>From {emailConfig.fromMonth || 'June'} To {emailConfig.toMonth || 'April'}</td></tr>
                          <tr style={{ height: '24px' }}><td style={{ fontWeight: 'bold' }}>Total Bus Fee:</td><td>₹18,500</td></tr>
                          <tr style={{ height: '24px' }}><td style={{ fontWeight: 'bold', color: '#059669' }}>Already Paid (Advance):</td><td style={{ color: '#059669', fontWeight: 'bold' }}>₹5,000</td></tr>
                          <tr style={{ height: '24px' }}><td style={{ fontWeight: 'bold', color: '#b91c1c' }}>Payable Bus Fee:</td><td style={{ color: '#b91c1c', fontWeight: 'bold' }}>₹13,500</td></tr>
                          <tr style={{ height: '24px' }}><td style={{ fontWeight: 'bold' }}>Date of Payment:</td><td>On or Before {emailConfig.deadline || '05.08.2025'}</td></tr>
                          <tr style={{ height: '35px', verticalAlign: 'top' }}><td style={{ fontWeight: 'bold', paddingTop: '4px' }}>Mode of Payment:</td><td style={{ paddingTop: '4px', lineHeight: '1.3' }}>{emailConfig.modeOfPayment}</td></tr>
                          <tr style={{ height: '24px' }}><td style={{ fontWeight: 'bold' }}>Venue:</td><td>{emailConfig.venue}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                      <p style={{ fontWeight: 'bold', margin: '0 0 6px 0' }}>Procedure to be followed:</p>
                      <ol style={{ margin: 0, paddingLeft: '18px' }}>
                        <li style={{ marginBottom: '4px' }}>Pay the bus fees as per the mentioned date and get the <strong>RECEIPT</strong>.</li>
                        <li style={{ marginBottom: '4px' }}>Enter the <strong>Fees receipt number, Date of Payment, Annual Fees and Transport app id</strong> in the 3TL Transport App.</li>
                        <li style={{ marginBottom: '4px' }}>After entering the data you will receive a mail to the registered id.</li>
                        <li style={{ marginBottom: '4px' }}>Show the fees receipt or allocation mail in Transport Office and get your <strong>BUS PASS ( Only student , No Parents )</strong> before {emailConfig.deadline || '05.08.2025'}.</li>
                      </ol>
                    </div>

                    <div style={{ backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b', padding: '10px', margin: '15px 0', borderRadius: '4px', color: '#b45309', fontSize: '12.5px' }}>
                      <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>Important Notes:</p>
                      <ol style={{ margin: 0, paddingLeft: '18px' }}>
                        <li style={{ marginBottom: '3px' }}>Your Seat will be <strong>CONFIRMED</strong> only after receiving the bus pass on or before {emailConfig.deadline || '05.08.2025'}.</li>
                        <li style={{ marginBottom: '3px' }}>If Not Paid, your allotted seat stays <strong>CANCELLED</strong> and it will be allocated to the other registered commuter.</li>
                        <li style={{ marginBottom: '3px' }}>From 6<sup>th</sup> August 2025 <strong>NEW BUS PASS</strong> is mandatory for boarding all the college bus.</li>
                      </ol>
                    </div>
                    
                    <p style={{ fontSize: '13px', margin: '15px 0 0 0' }}>Thank you</p>
                    <p style={{ fontSize: '13px', fontWeight: 'bold', margin: 0 }}>With Regards,</p>
                    <p style={{ fontSize: '13px', fontWeight: 'bold', margin: 0 }}>Team Transport</p>
                  </div>
                ) : (
                  <div>
                    <h2 style={{ color: '#1d4ed8', textAlign: 'center', marginBottom: '5px', fontSize: '20px', fontWeight: 'bold' }}>Transport Section PSG iTech</h2>
                    <hr style={{ border: '0', borderTop: '1px solid #d1d5db', marginBottom: '15px' }} />
                    <p style={{ fontSize: '14px', margin: '0 0 10px 0' }}>Dear [Faculty/Staff Name],</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px 0' }}>Greetings of the Day !</p>
                    <p style={{ fontSize: '14px', lineHeight: '1.4', margin: '0 0 15px 0' }}>Transport section of PSGiTech is happy to <span style={{ backgroundColor: '#f59e0b', color: '#000', padding: '2px 5px', borderRadius: '3px', fontWeight: 'bold', fontSize: '12px' }}>ALLOCATE</span> you a seat in college bus based on your chosen boarding point.</p>
                    
                    <div style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '6px', padding: '12px', margin: '15px 0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <tbody>
                          <tr style={{ height: '24px' }}><td style={{ fontWeight: 'bold', width: '40%' }}>Bus Route:</td><td>[Allocated Route Number - Name]</td></tr>
                          <tr style={{ height: '24px' }}><td style={{ fontWeight: 'bold' }}>Boarding Point:</td><td>[Staff Boarding Point]</td></tr>
                          <tr style={{ height: '24px' }}><td style={{ fontWeight: 'bold' }}>Duration:</td><td>From {emailConfig.fromMonth || 'June'} To {emailConfig.toMonth || 'April'}</td></tr>
                          <tr style={{ height: '24px' }}><td style={{ fontWeight: 'bold' }}>Annual Bus Fee:</td><td>₹9,250 (Concession Applied)</td></tr>
                          <tr style={{ height: '24px' }}><td style={{ fontWeight: 'bold' }}>Date of Payment:</td><td>On or Before {emailConfig.deadline || '05.08.2025'}</td></tr>
                          <tr style={{ height: '35px', verticalAlign: 'top' }}><td style={{ fontWeight: 'bold', paddingTop: '4px' }}>Mode of Payment:</td><td style={{ paddingTop: '4px', lineHeight: '1.3' }}>{emailConfig.modeOfPayment}</td></tr>
                          <tr style={{ height: '24px' }}><td style={{ fontWeight: 'bold' }}>Venue:</td><td>{emailConfig.venue}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                      <p style={{ fontWeight: 'bold', margin: '0 0 6px 0' }}>Procedure to be followed:</p>
                      <ol style={{ margin: 0, paddingLeft: '18px' }}>
                        <li style={{ marginBottom: '4px' }}>Pay the bus fees as per the mentioned date and get the <strong>RECEIPT</strong>.</li>
                        <li style={{ marginBottom: '4px' }}>Enter the <strong>Fees receipt number, Date of Payment, Annual Fees and Transport app id</strong> in the 3TL Transport App.</li>
                        <li style={{ marginBottom: '4px' }}>After entering the data you will receive a mail to the registered id.</li>
                        <li style={{ marginBottom: '4px' }}>Show the fees receipt or allocation mail in Transport Office and get your <strong>BUS PASS</strong> before {emailConfig.deadline || '05.08.2025'}.</li>
                      </ol>
                    </div>

                    <div style={{ backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b', padding: '10px', margin: '15px 0', borderRadius: '4px', color: '#b45309', fontSize: '12.5px' }}>
                      <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>Important Notes:</p>
                      <ol style={{ margin: 0, paddingLeft: '18px' }}>
                        <li style={{ marginBottom: '3px' }}>Your Seat will be <strong>CONFIRMED</strong> only after receiving the bus pass on or before {emailConfig.deadline || '05.08.2025'}.</li>
                        <li style={{ marginBottom: '3px' }}>If Not Paid, your allotted seat stays <strong>CANCELLED</strong> and it will be allocated to the other registered commuter.</li>
                        <li style={{ marginBottom: '3px' }}>From 6<sup>th</sup> August 2025 <strong>NEW BUS PASS</strong> is mandatory for boarding all the college bus.</li>
                      </ol>
                    </div>
                    
                    <p style={{ fontSize: '13px', margin: '15px 0 0 0' }}>Thank you</p>
                    <p style={{ fontSize: '13px', fontWeight: 'bold', margin: 0 }}>With Regards,</p>
                    <p style={{ fontSize: '13px', fontWeight: 'bold', margin: 0 }}>Team Transport</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
                        background: reg.registrationStatus === 'allocated' ? 'rgba(16,185,129,0.15)' : (reg.registrationStatus === 'rejected' || reg.registrationStatus === 'deallocated' || reg.registrationStatus === 'cancelled' || reg.registrationStatus.includes('rejected')) ? 'rgba(244,63,94,0.15)' : 'rgba(245,158,11,0.15)',
                        color: reg.registrationStatus === 'allocated' ? 'var(--accent-emerald)' : (reg.registrationStatus === 'rejected' || reg.registrationStatus === 'deallocated' || reg.registrationStatus === 'cancelled' || reg.registrationStatus.includes('rejected')) ? 'var(--accent-rose)' : 'var(--accent-amber)'
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
                        {reg.registrationStatus === 'allocated' && (
                          <button className="btn" style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => deallocateUser(reg._id)}>Deallocate</button>
                        )}
                        <button className="btn" style={{ marginLeft: '5px', background: reg.isBlocked ? '#10b981' : '#4b5563', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }} onClick={() => toggleBlock(reg._id, reg.isBlocked)}>
                          {reg.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                        {selectedCommuterId === reg._id && (
                          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <button className="btn" style={{ background: '#4b5563', color: '#ffffff', border: 'none', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }} onClick={() => resendMail(reg._id, 'registration')}>Reg Mail</button>
                            <button className="btn" style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }} onClick={() => resendMail(reg._id, 'allocation')}>Alloc Mail</button>
                            <button className="btn" style={{ background: '#ea580c', color: '#ffffff', border: 'none', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }} onClick={() => resendMail(reg._id, 'deallocation')}>Dealloc Mail</button>
                            <button className="btn" style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }} onClick={() => resendMail(reg._id, 'unallocated')}>Unalloc Mail</button>
                            <button className="btn" style={{ background: '#be123c', color: '#ffffff', border: 'none', padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer' }} onClick={() => resendMail(reg._id, 'unpaid')}>Unpaid Mail</button>
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

      {/* Modal: Edit Commuter Details */}
      {editingCommuter && (
        <div className="modal-overlay" onClick={() => setEditingCommuter(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Edit Details for {editingCommuter.name}</h2>
              <button className="modal-close" onClick={() => setEditingCommuter(null)}>✕</button>
            </div>
            
            <div className="form-group">
              <label>Full Name</label>
              <input className="form-control" value={editingCommuter.name || ''} onChange={e => setEditingCommuter({ ...editingCommuter, name: e.target.value })} />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input className="form-control" value={editingCommuter.mailId || ''} onChange={e => setEditingCommuter({ ...editingCommuter, mailId: e.target.value })} />
            </div>

            <div className="form-group">
              <label>User Type</label>
              <select className="form-control" value={editingCommuter.userType || 'student'} onChange={e => setEditingCommuter({ ...editingCommuter, userType: e.target.value })}>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            {editingCommuter.userType === 'student' ? (
              <>
                <div className="form-group">
                  <label>Roll / Register Number</label>
                  <input className="form-control" value={editingCommuter.registerNumber || ''} onChange={e => setEditingCommuter({ ...editingCommuter, registerNumber: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Academic Year</label>
                  <select className="form-control" value={editingCommuter.academicYear || 1} onChange={e => setEditingCommuter({ ...editingCommuter, academicYear: parseInt(e.target.value) })}>
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                    <option value={5}>5th Year</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="form-group">
                <label>Employee ID</label>
                <input className="form-control" value={editingCommuter.employeeId || ''} onChange={e => setEditingCommuter({ ...editingCommuter, employeeId: e.target.value })} />
              </div>
            )}

            <div className="form-group">
              <label>Boarding Stop</label>
              <input className="form-control" value={editingCommuter.boardingPoint || ''} onChange={e => setEditingCommuter({ ...editingCommuter, boardingPoint: e.target.value })} placeholder="Enter requested stop name" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setEditingCommuter(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveCommuterDetails} disabled={!editingCommuter.name || !editingCommuter.mailId}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manual Allocation Selector */}
      {manualAllocTarget && (
        <div className="modal-overlay" onClick={() => setManualAllocTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Select Route & Stop for {manualAllocTarget.registration.name}</h2>
              <button className="modal-close" onClick={() => setManualAllocTarget(null)}>✕</button>
            </div>
            
            <div className="form-group">
              <label>Select Route</label>
              <select className="form-control" value={manualAllocTarget.routeId} onChange={e => {
                const route = routes.find(r => r._id === e.target.value);
                setManualAllocTarget({
                  ...manualAllocTarget,
                  routeId: e.target.value,
                  stopName: route && route.stops.length > 0 ? route.stops[0].name : ''
                });
              }}>
                <option value="">Select Route...</option>
                {sortedRoutes.map(r => <option key={r._id} value={r._id}>{r.routeNumber} — {r.routeName}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Select Boarding Stop</label>
              <select className="form-control" value={manualAllocTarget.stopName} onChange={e => setManualAllocTarget({ ...manualAllocTarget, stopName: e.target.value })}>
                <option value="">Select Stop...</option>
                {manualAllocTarget.routeId && routes.find(r => r._id === manualAllocTarget.routeId)?.stops.map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setManualAllocTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => allocateIndividualCommuter(
                manualAllocTarget.registration._id,
                manualAllocTarget.routeId,
                manualAllocTarget.stopName
              )} disabled={!manualAllocTarget.routeId || !manualAllocTarget.stopName}>
                Confirm Allocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
