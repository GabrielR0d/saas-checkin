import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import type { Client, Card, AccessLog } from '../../types'

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

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'cards' | 'history'>('cards')

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ['clients', id],
    queryFn: async () => (await api.get(`/clients/${id}`)).data,
  })

  const { data: cards } = useQuery<Card[]>({
    queryKey: ['clients', id, 'cards'],
    queryFn: async () => (await api.get('/cards', { params: { clientId: id } })).data?.data ?? [],
  })

  const { data: logs } = useQuery<{ data: AccessLog[] }>({
    queryKey: ['access-logs', 'client', id],
    queryFn: async () => (await api.get('/access-logs', { params: { clientId: id, limit: 20 } })).data,
    enabled: tab === 'history',
  })

  const toggleActive = useMutation({
    mutationFn: () => api.put(`/clients/${id}`, { isActive: !client?.isActive }),
    onSuccess: () => {
      toast.success('Status atualizado')
      qc.invalidateQueries({ queryKey: ['clients', id] })
    },
    onError: () => toast.error('Erro ao atualizar'),
  })

  if (isLoading) {
    return <div className="p-6 text-slate-400">Carregando...</div>
  }

  if (!client) {
    return <div className="p-6 text-slate-400">Participante não encontrado</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/clients')}
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">{client.name}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{client.phone} · {client.email || 'Sem email'}</p>
        </div>
        <button
          onClick={() => toggleActive.mutate()}
          disabled={toggleActive.isPending}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            client.isActive
              ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400'
              : 'bg-slate-700 text-slate-400 hover:bg-green-500/20 hover:text-green-400'
          }`}
        >
          {client.isActive ? 'Ativo' : 'Inativo'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-800">
        {(['cards', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-100'
            }`}
          >
            {t === 'cards' ? 'Cartões' : 'Histórico'}
          </button>
        ))}
      </div>

      {tab === 'cards' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          {!cards || cards.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">Nenhum cartão atribuído</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-4 py-3 text-slate-400 font-medium">UID</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Label</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => (
                  <tr key={card.id} className="border-b border-slate-800 last:border-0">
                    <td className="px-4 py-3 font-mono text-slate-300">{card.uid}</td>
                    <td className="px-4 py-3 text-slate-300">{card.label || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        card.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                        card.status === 'BLOCKED' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {card.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          {!logs?.data || logs.data.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">Nenhum registro de acesso</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-4 py-3 text-slate-400 font-medium">Data/Hora</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Evento</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Cartão</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {logs.data.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800 last:border-0">
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${EVENT_COLORS[log.eventType]}`}>
                        {EVENT_LABELS[log.eventType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">{log.cardUid}</td>
                    <td className="px-4 py-3 text-slate-300">{log.device?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
