import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'
import Layout from './components/Layout'
import LoginPage from './pages/Login'
import SignupPage from './pages/Signup'
import DashboardPage from './pages/Dashboard'
import ClientsPage from './pages/Clients'
import CardsPage from './pages/Cards'
import DevicesPage from './pages/Devices'
import AccessLogsPage from './pages/AccessLogs'
import SettingsPage from './pages/Settings'
import PlansPage from './pages/Plans'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="cards" element={<CardsPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="logs" element={<AccessLogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="plans" element={<PlansPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
