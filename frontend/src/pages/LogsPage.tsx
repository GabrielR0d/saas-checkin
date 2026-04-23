import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import type { AccessLog, Device, PaginatedResponse } from '../types'

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
  const [deviceId, setDeviceId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data, isLoading } = useQuery<PaginatedResponse<AccessLog>>({
    queryKey: ['access-logs', page, eventType, deviceId, dateFrom, dateTo],
    queryFn: async () =>
      (
        await api.get('/access-logs', {
          params: {
            page,
            limit: 20,
            eventType: eventType || undefined,
            deviceId: deviceId || undefined,
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

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  function exportCsv() {
    const params = new URLSearchParams({
      ...(eventType && { eventType }),
      ...(deviceId && { deviceId }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    })
    window.open(`${import.meta.env.VITE_API_URL || '/api/v1'}/reports/export/csv?${params}`, '_blank')
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Histórico de Acessos</h1>
          <p className="text-slate-400 text-sm mt-1">{data?.total ?? 0} registros</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          value={deviceId}
          onChange={(e) => { setDeviceId(e.target.value); setPage(1) }}
          className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos dispositivos</option>
          {devices?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

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
              <th className="px-4 py-3 text-slate-400 font-medium text-center">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-500">Carregando...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-500">Nenhum registro encontrado</td></tr>
            ) : (
              data?.data.map((log) => (
                <tr key={log.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${EVENT_COLORS[log.eventType]}`}>
                      {EVENT_LABELS[log.eventType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">{log.cardUid}</td>
                  <td className="px-4 py-3 text-slate-300">{log.client?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{log.device?.name || '—'}</td>
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
