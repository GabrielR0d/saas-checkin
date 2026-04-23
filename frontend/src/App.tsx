import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { PrivateRoute } from './components/PrivateRoute'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { DashboardPage } from './pages/DashboardPage'
import { ClientsPage } from './pages/ClientsPage'
import { ClientDetailPage } from './pages/clients/ClientDetailPage'
import { CardsPage } from './pages/CardsPage'
import { DevicesPage } from './pages/DevicesPage'
import { LogsPage } from './pages/LogsPage'
import { SettingsPage } from './pages/SettingsPage'
import { BillingPage } from './pages/BillingPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/cards" element={<CardsPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/billing" element={<BillingPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
