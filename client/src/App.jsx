import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import Registration from './pages/Registration'
import UserLogin from './pages/UserLogin'
import UserDashboard from './pages/UserDashboard'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import PaymentUpload from './pages/PaymentUpload'
import OfficePayment from './pages/OfficePayment'
import OfficeFinalPayment from './pages/OfficeFinalPayment'
import RoutesViewer from './pages/RoutesViewer'
import Suggestions from './pages/Suggestions'

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register/:userType" element={<Registration />} />
            <Route path="/login" element={<UserLogin />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/payment" element={<PaymentUpload />} />
            <Route path="/office" element={<OfficePayment />} />
            <Route path="/officefinalpayment" element={<OfficeFinalPayment />} />
            <Route path="officefinalpayment" element={<OfficeFinalPayment />} />
            <Route path="/office-final-payment" element={<OfficeFinalPayment />} />
            <Route path="/routes-viewer" element={<RoutesViewer />} />
            <Route path="/suggestions" element={<Suggestions />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <footer className="footer">
        <p>© 2026 PSG Institute of Technology and Applied Research</p>
      </footer>
    </Router>
  )
}

export default App
