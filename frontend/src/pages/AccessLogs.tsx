import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { getAccessLogs, exportCsv } from '../api'
import type { AccessEventType } from '../types'

const EVENT_CONFIG: Record<AccessEventType, { label: string; className: string }> = {
  ENTRY: { label: 'Entrada', className: 'bg-green-100 text-green-700' },
  EXIT: { label: 'Saída', className: 'bg-blue-100 text-blue-700' },
  UNKNOWN_CARD: { label: 'Desconhecido', className: 'bg-yellow-100 text-yellow-700' },
  BLOCKED_CARD: { label: 'Bloqueado', className: 'bg-red-100 text-red-700' },
}

export default function AccessLogsPage() {
  const [page, setPage] = useState(1)
  const [eventType, setEventType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const params = Object.fromEntries(
    Object.entries({ page, limit: 20, eventType, dateFrom, dateTo }).filter(([, v]) => v !== '' && v !== 0),
  ) as Record<string, string | number>

  const { data } = useQuery({
    queryKey: ['access-logs', page, eventType, dateFrom, dateTo],
    queryFn: () => getAccessLogs(params),
  })

  const handleExport = async () => {
    const blob = await exportCsv({ eventType, dateFrom, dateTo })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `registros-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Registros de Acesso</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={eventType}
          onChange={(e) => { setEventType(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os eventos</option>
          <option value="ENTRY">Entradas</option>
          <option value="EXIT">Saídas</option>
          <option value="UNKNOWN_CARD">Desconhecidos</option>
          <option value="BLOCKED_CARD">Bloqueados</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Data/Hora', 'Cliente / UID', 'Evento', 'Leitor', 'WhatsApp'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data?.data?.map((log) => {
              const cfg = EVENT_CONFIG[log.eventType]
              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{log.client?.name ?? '—'}</p>
                    <p className="text-xs font-mono text-gray-400">{log.cardUid}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.device?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {log.whatsappSent && (
                      <MessageCircle className="w-4 h-4 text-green-500" />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!data?.data?.length && (
          <p className="text-sm text-gray-400 text-center py-10">Nenhum registro encontrado.</p>
        )}
      </div>

      {(data?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {data?.total} registros · página {page} de {data?.totalPages}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= (data?.totalPages ?? 1)} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
