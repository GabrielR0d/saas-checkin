import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownLeft, ArrowUpRight, HelpCircle, AlertCircle, Activity } from 'lucide-react'
import { api } from '../lib/api'
import { socket } from '../lib/socket'
import { useAuth } from '../store/auth'
import type { ReportSummary, AccessLog } from '../types'

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins} min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

const EVENT_CONFIG = {
  ENTRY: { label: 'ENTRADA', color: 'bg-green-500/20 text-green-400', Icon: ArrowDownLeft },
  EXIT: { label: 'SAÍDA', color: 'bg-blue-500/20 text-blue-400', Icon: ArrowUpRight },
  UNKNOWN_CARD: { label: 'DESCONHECIDO', color: 'bg-yellow-500/20 text-yellow-400', Icon: HelpCircle },
  BLOCKED_CARD: { label: 'BLOQUEADO', color: 'bg-red-500/20 text-red-400', Icon: AlertCircle },
} as const

export function DashboardPage() {
  const { user } = useAuth()
  const [feed, setFeed] = useState<AccessLog[]>([])

  const { data: summary } = useQuery<ReportSummary>({
    queryKey: ['reports/summary'],
    queryFn: async () => (await api.get('/reports/summary')).data,
    refetchInterval: 30_000,
  })

  const { data: initialLogs } = useQuery<{ data: AccessLog[] }>({
    queryKey: ['access-logs/recent'],
    queryFn: async () => (await api.get('/access-logs?page=1&limit=20')).data,
  })

  useEffect(() => {
    if (initialLogs?.data) {
      setFeed(initialLogs.data)
    }
  }, [initialLogs])

  useEffect(() => {
    if (!user?.tenantId) return

    socket.connect()
    socket.emit('join', `tenant:${user.tenantId}`)

    socket.on('access:new', (log: AccessLog) => {
      setFeed((prev) => [log, ...prev].slice(0, 20))
    })

    return () => {
      socket.off('access:new')
      socket.disconnect()
    }
  }, [user?.tenantId])

  const stats = [
    {
      label: 'Entradas hoje',
      value: summary?.todayEntries ?? '—',
      icon: ArrowDownLeft,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Saídas hoje',
      value: summary?.todayExits ?? '—',
      icon: ArrowUpRight,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Cartões desconhecidos',
      value: summary?.unknownCards ?? '—',
      icon: HelpCircle,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Dispositivos ativos',
      value: summary?.totalDevices ?? '—',
      icon: Activity,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Visão geral em tempo real</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{label}</span>
              <span className={`${bg} ${color} p-2 rounded-lg`}>
                <Icon size={18} />
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Real-time feed */}
      <div className="bg-slate-900 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h2 className="font-semibold text-slate-100">Feed de acessos</h2>
        </div>

        {feed.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Nenhum acesso registrado ainda
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {feed.map((log) => {
              const cfg = EVENT_CONFIG[log.eventType] ?? EVENT_CONFIG.UNKNOWN_CARD
              const Icon = cfg.Icon
              return (
                <li key={log.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-800/50 transition-colors">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                    <Icon size={12} />
                    {cfg.label}
                  </span>
                  <span className="text-sm text-slate-300 font-mono">{log.cardUid}</span>
                  <span className="text-sm text-slate-400 truncate flex-1">
                    {log.client?.name ?? <span className="text-slate-600">sem cliente</span>}
                  </span>
                  <span className="text-sm text-slate-500 shrink-0">{log.device?.name}</span>
                  <span className="text-xs text-slate-600 shrink-0">{relativeTime(log.createdAt)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
