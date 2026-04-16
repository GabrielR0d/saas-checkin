import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Users, CreditCard, Cpu, LogIn, LogOut, AlertTriangle,
} from 'lucide-react'
import { getSummary, getAccessLogs } from '../api'
import LiveAccessFeed from '../components/LiveAccessFeed'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const KPI_CONFIG = [
  { key: 'totalClients', label: 'Clientes', icon: Users, color: 'bg-blue-100 text-blue-600' },
  { key: 'totalCards', label: 'Cartões', icon: CreditCard, color: 'bg-indigo-100 text-indigo-600' },
  { key: 'totalDevices', label: 'Leitores', icon: Cpu, color: 'bg-purple-100 text-purple-600' },
  { key: 'todayEntries', label: 'Entradas Hoje', icon: LogIn, color: 'bg-green-100 text-green-600' },
  { key: 'todayExits', label: 'Saídas Hoje', icon: LogOut, color: 'bg-sky-100 text-sky-600' },
  { key: 'unknownCards', label: 'Desconhecidos', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-600' },
]

function buildChartData(logs: { eventType: string; createdAt: string }[]) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    return { day: format(d, 'dd/MM', { locale: ptBR }), Entradas: 0, Saídas: 0 }
  })
  for (const log of logs) {
    const dayStr = format(new Date(log.createdAt), 'dd/MM', { locale: ptBR })
    const slot = days.find((d) => d.day === dayStr)
    if (!slot) continue
    if (log.eventType === 'ENTRY') slot.Entradas++
    else if (log.eventType === 'EXIT') slot['Saídas']++
  }
  return days
}

export default function DashboardPage() {
  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: getSummary,
    refetchInterval: 30_000,
  })

  const { data: logsData } = useQuery({
    queryKey: ['logs-chart'],
    queryFn: () =>
      getAccessLogs({
        limit: 500,
        dateFrom: subDays(new Date(), 7).toISOString(),
        eventType: 'ENTRY,EXIT',
      }),
    refetchInterval: 60_000,
  })

  const chartData = buildChartData(logsData?.data ?? [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {KPI_CONFIG.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {summary?.[key as keyof typeof summary] ?? '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Acessos — Últimos 7 dias</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="Entradas"
              stroke="#10b981"
              fill="url(#colorEntradas)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Saídas"
              stroke="#3b82f6"
              fill="url(#colorSaidas)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <LiveAccessFeed />
    </div>
  )
}
