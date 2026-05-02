import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, CreditCard, Wifi, ClipboardList,
  Settings, Zap, LogOut, Menu, X,
} from 'lucide-react'
import { useAuth } from '../store/auth'
import { socket } from '../lib/socket'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/clients', icon: Users, label: 'Participantes' },
  { to: '/cards', icon: CreditCard, label: 'Cartões' },
  { to: '/devices', icon: Wifi, label: 'Dispositivos' },
  { to: '/logs', icon: ClipboardList, label: 'Histórico' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
  { to: '/billing', icon: Zap, label: 'Billing' },
]

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  function handleLogout() {
    socket.disconnect()
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      {/* Top bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 shrink-0 gap-4">
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <span className="text-indigo-400 font-bold text-lg tracking-tight">CheckIn RFID</span>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50 transform transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <span className="text-indigo-400 font-bold text-lg tracking-tight">CheckIn RFID</span>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
