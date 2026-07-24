import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { CheckinSourceBadge } from '../../components/CheckinSourceBadge'
import type { Client, AccessLog } from '../../types'

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

interface EditForm {
  name: string
  phone: string
  phoneNumber: string
  email: string
  document: string
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'history'>('history')
  const [historyPage, setHistoryPage] = useState(1)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({ name: '', phone: '', phoneNumber: '', email: '', document: '' })

  const { data: client, isLoading } = useQuery<Client>({
    queryKey: ['clients', id],
    queryFn: async () => (await api.get(`/clients/${id}`)).data,
  })



  const { data: logs } = useQuery<{ data: AccessLog[]; meta: { total: number; totalPages: number } }>({
    queryKey: ['access-logs', 'client', id, historyPage],
    queryFn: async () =>
      (await api.get('/access-logs', { params: { clientId: id, limit: 20, page: historyPage } })).data,
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

  const updateClient = useMutation({
    mutationFn: (body: EditForm) => api.put(`/clients/${id}`, body),
    onSuccess: () => {
      toast.success('Participante atualizado!')
      qc.invalidateQueries({ queryKey: ['clients', id] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      setShowEdit(false)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? 'Erro ao atualizar'
      toast.error(msg)
    },
  })

  function openEdit() {
    if (!client) return
    setEditForm({
      name: client.name,
      phone: client.phone,
      phoneNumber: client.phoneNumber ?? '',
      email: client.email ?? '',
      document: client.document ?? '',
    })
    setShowEdit(true)
  }

  if (isLoading) {
    return <div className="p-6 text-slate-400">A carregar...</div>
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            <span className="text-slate-400 text-sm">{client.phone}</span>
            {client.phoneNumber && (
              <span className="text-green-400 text-sm">📱 {client.phoneNumber}</span>
            )}
            {client.email && (
              <span className="text-slate-400 text-sm">{client.email}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Pencil size={14} />
            Editar
          </button>
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
      </div>

      {tab === 'history' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          {!logs?.data || logs.data.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">Sem registos de acesso</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-4 py-3 text-slate-400 font-medium">Data/Hora</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Evento</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Dispositivo</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">Origem</th>
                </tr>
              </thead>
              <tbody>
                {logs.data.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800 last:border-0">
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(log.occurredAt).toLocaleString('pt-PT')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${EVENT_COLORS[log.eventType]}`}>
                        {EVENT_LABELS[log.eventType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{log.device?.name || '—'}</td>
                    <td className="px-4 py-3"><CheckinSourceBadge source={log.checkinSource} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(logs?.meta?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
              <span className="text-sm text-slate-400">
                Página {historyPage} de {logs?.meta?.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setHistoryPage((p) => Math.min(logs?.meta?.totalPages ?? 1, p + 1))}
                  disabled={historyPage === (logs?.meta?.totalPages ?? 1)}
                  className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Editar Participante</h2>
            <form
              onSubmit={(e) => { e.preventDefault(); updateClient.mutate(editForm) }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome *</label>
                <input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Telefone *</label>
                <input
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="912 345 678"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Telefone WhatsApp
                  <span className="ml-1.5 text-xs font-normal text-slate-500">(formato: 351912345678)</span>
                </label>
                <input
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  placeholder="351912345678"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Documento</label>
                <input
                  value={editForm.document}
                  onChange={(e) => setEditForm({ ...editForm, document: e.target.value })}
                  placeholder="NIF / CC"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updateClient.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  {updateClient.isPending ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
