import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import { CheckinSourceBadge } from '../components/CheckinSourceBadge'
import type { AccessLog, Client, Device, PaginatedResponse } from '../types'

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const EVENT_COLORS = {
  ENTRY: 'bg-green-500/20 text-green-400',
  EXIT: 'bg-blue-500/20 text-blue-400',
  UNKNOWN_CARD: 'bg-yellow-500/20 text-yellow-400',
  BLOCKED_CARD: 'bg-red-500/20 text-red-400',
}

const EVENT_LABELS = {
  ENTRY: 'ENTRADA',
  EXIT: 'SAÍDA',
  UNKNOWN_CARD: 'DESCONHECIDO',
  BLOCKED_CARD: 'BLOQUEADO',
}

export function LogsPage() {
  const [page, setPage] = useState(1)
  const [eventType, setEventType] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [checkinSource, setCheckinSource] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const debouncedClientSearch = useDebounce(clientSearch)

  const { data, isLoading } = useQuery<PaginatedResponse<AccessLog>>({
    queryKey: ['access-logs', page, eventType, clientId, deviceId, checkinSource, dateFrom, dateTo],
    queryFn: async () =>
      (
        await api.get('/access-logs', {
          params: {
            page,
            limit: 20,
            eventType: eventType || undefined,
            clientId: clientId || undefined,
            deviceId: deviceId || undefined,
            checkinSource: checkinSource || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        })
      ).data,
  })

  const { data: devices } = useQuery<Device[]>({
    queryKey: ['devices-select'],
    queryFn: async () => {
      const res = await api.get('/devices')
      return res.data?.data ?? res.data ?? []
    },
  })

  const { data: clients } = useQuery<PaginatedResponse<Client>>({
    queryKey: ['clients-logs-filter', debouncedClientSearch],
    queryFn: async () =>
      (await api.get('/clients', { params: { limit: 30, search: debouncedClientSearch || undefined } })).data,
  })

  const totalPages = data?.meta?.totalPages ?? 1

  async function exportCsv() {
    const params = new URLSearchParams({
      ...(eventType && { eventType }),
      ...(clientId && { clientId }),
      ...(deviceId && { deviceId }),
      ...(checkinSource && { checkinSource }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    })
    try {
      const token = localStorage.getItem('token')
      const base = import.meta.env.VITE_API_URL || '/api/v1'
      const res = await fetch(`${base}/reports/export/csv?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `registros-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao exportar CSV')
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Histórico de Acessos</h1>
          <p className="text-slate-400 text-sm mt-1">{data?.meta?.total ?? 0} registros</p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <select
          value={eventType}
          onChange={(e) => { setEventType(e.target.value); setPage(1) }}
          className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos os eventos</option>
          <option value="ENTRY">Entrada</option>
          <option value="EXIT">Saída</option>
          <option value="UNKNOWN_CARD">Desconhecido</option>
          <option value="BLOCKED_CARD">Bloqueado</option>
        </select>

        <select
          value={checkinSource}
          onChange={(e) => { setCheckinSource(e.target.value); setPage(1) }}
          className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todas as origens</option>
          <option value="rfid">RFID</option>
          <option value="whatsapp">WhatsApp</option>
        </select>

        <select
          value={deviceId}
          onChange={(e) => { setDeviceId(e.target.value); setPage(1) }}
          className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos dispositivos</option>
          {devices?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* Client filter — type to search, click result to select */}
        <div className="relative">
          <input
            type="text"
            value={clientSearch}
            onChange={(e) => {
              setClientSearch(e.target.value)
              if (clientId) { setClientId(''); setPage(1) }
            }}
            placeholder="Filtrar por participante..."
            className={`w-full bg-slate-800 border rounded-lg px-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500 text-slate-100 ${
              clientId ? 'border-indigo-500' : 'border-slate-700'
            }`}
          />
          {/* Search results dropdown */}
          {clientSearch && !clientId && clients && clients.data.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-52 overflow-y-auto">
              {clients.data.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setClientId(c.id); setClientSearch(c.name); setPage(1) }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-100 hover:bg-slate-700 transition-colors"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {/* Clear selection */}
          {(clientId || clientSearch) && (
            <button
              type="button"
              onClick={() => { setClientId(''); setClientSearch(''); setPage(1) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-100"
              title="Limpar filtro"
            >
              ✕
            </button>
          )}
        </div>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              <th className="px-4 py-3 text-slate-400 font-medium">Data/Hora</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Evento</th>
              <th className="px-4 py-3 text-slate-400 font-medium">UID Cartão</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Participante</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Dispositivo</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Origem</th>
              <th className="px-4 py-3 text-slate-400 font-medium text-center">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-500">Carregando...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-500">Nenhum registro encontrado</td></tr>
            ) : (
              data?.data.map((log) => (
                <tr key={log.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                    {new Date(log.occurredAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${EVENT_COLORS[log.eventType]}`}>
                      {EVENT_LABELS[log.eventType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">
                    {log.cardUid ?? <span className="not-italic text-slate-500">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{log.client?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{log.device?.name || '—'}</td>
                  <td className="px-4 py-3"><CheckinSourceBadge source={log.checkinSource} /></td>
                  <td className="px-4 py-3 text-center">
                    {log.whatsappSent
                      ? <span className="text-green-400">✓</span>
                      : <span className="text-slate-600">✗</span>
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <span className="text-sm text-slate-400">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
