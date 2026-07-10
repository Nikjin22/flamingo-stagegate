import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import useAuthStore from './store/authStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Launches from './pages/Launches'
import LaunchDetail from './pages/LaunchDetail'
import Readiness from './pages/Readiness'
import Kanban from './pages/Kanban'
import Users from './pages/Users'
import AuditTrail from './pages/AuditTrail'
import ForgotPassword from './pages/ForgotPassword'
import Gantt from './pages/Gantt'
import Layout from './components/layout/Layout'

const queryClient = new QueryClient()

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="launches" element={<Launches />} />
            <Route path="launches/:id" element={<LaunchDetail />} />
            <Route path="launches/:id/readiness" element={<Readiness />} />
            <Route path="launches/:id/kanban" element={<Kanban />} />
            <Route path="users" element={<Users />} />
            <Route path="audit" element={<AuditTrail />} />
            <Route path="launches/:id/gantt" element={<Gantt />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}