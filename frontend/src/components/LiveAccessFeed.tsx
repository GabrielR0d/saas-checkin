import { useEffect, useState, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getSocket } from '../hooks/useSocket'
import type { AccessLog } from '../types'

const EVENT_CONFIG = {
  ENTRY: { label: 'Entrada', className: 'bg-green-100 text-green-700' },
  EXIT: { label: 'Saída', className: 'bg-blue-100 text-blue-700' },
  UNKNOWN_CARD: { label: 'Desconhecido', className: 'bg-yellow-100 text-yellow-700' },
  BLOCKED_CARD: { label: 'Bloqueado', className: 'bg-red-100 text-red-700' },
}

export default function LiveAccessFeed() {
  const [events, setEvents] = useState<AccessLog[]>([])
  const [newEventId, setNewEventId] = useState<string | null>(null)

  const handleNewEvent = useCallback((log: AccessLog) => {
    setEvents((prev) => [log, ...prev].slice(0, 50))
    setNewEventId(log.id)
    setTimeout(() => setNewEventId(null), 3000)
  }, [])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    socket.on('access:new', handleNewEvent)
    return () => { socket.off('access:new', handleNewEvent) }
  }, [handleNewEvent])

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Feed ao Vivo</h3>
        <p className="text-sm text-gray-400 text-center py-8">
          Aguardando eventos em tempo real...
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">Feed ao Vivo</h3>
        <span className="flex items-center gap-1.5 text-xs text-green-600">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          AO VIVO
        </span>
      </div>
      <div className="divide-y divide-gray-50">
        {events.map((event) => {
          const cfg = EVENT_CONFIG[event.eventType] ?? EVENT_CONFIG.UNKNOWN_CARD
          const isNew = event.id === newEventId
          return (
            <div
              key={event.id}
              className={`flex items-center justify-between px-6 py-3 transition-all ${
                isNew ? 'border-l-4 border-blue-500 bg-blue-50/30' : 'border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.className}`}
                >
                  {cfg.label}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {event.client?.name ?? `UID: ${event.cardUid}`}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {event.device?.name ?? 'Leitor desconhecido'}
                  </p>
                </div>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0 ml-4">
                {formatDistanceToNow(new Date(event.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
