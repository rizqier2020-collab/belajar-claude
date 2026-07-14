import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import { Spinner } from './components/ui'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MyLeaves from './pages/MyLeaves'
import MyReimbursements from './pages/MyReimbursements'
import PendingApprovals from './pages/PendingApprovals'
import AdminLeaves from './pages/admin/AdminLeaves'
import AdminReimbursements from './pages/admin/AdminReimbursements'
import AdminBalances from './pages/admin/AdminBalances'
import AdminUsers from './pages/admin/AdminUsers'
import AdminHolidays from './pages/admin/AdminHolidays'
import AdminReports from './pages/admin/AdminReports'

function Protected({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/leaves" element={<MyLeaves />} />
        <Route path="/reimbursements" element={<MyReimbursements />} />
        <Route
          path="/approvals"
          element={
            <Protected roles={['manager', 'director', 'admin']}>
              <PendingApprovals />
            </Protected>
          }
        />
        <Route path="/admin/leaves" element={<Protected roles={['admin']}><AdminLeaves /></Protected>} />
        <Route path="/admin/reimbursements" element={<Protected roles={['admin']}><AdminReimbursements /></Protected>} />
        <Route path="/admin/balances" element={<Protected roles={['admin']}><AdminBalances /></Protected>} />
        <Route path="/admin/users" element={<Protected roles={['admin']}><AdminUsers /></Protected>} />
        <Route path="/admin/holidays" element={<Protected roles={['admin']}><AdminHolidays /></Protected>} />
        <Route path="/admin/reports" element={<Protected roles={['admin']}><AdminReports /></Protected>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
