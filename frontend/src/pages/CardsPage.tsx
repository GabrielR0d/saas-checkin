import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Card, Client, PaginatedResponse } from '../types'

interface NewCardForm {
  uid: string
  label: string
  status: 'ACTIVE' | 'BLOCKED' | 'LOST'
  clientId: string
}

const EMPTY: NewCardForm = { uid: '', label: '', status: 'ACTIVE', clientId: '' }

const STATUS_STYLES = {
  ACTIVE: 'bg-green-500/20 text-green-400',
  BLOCKED: 'bg-red-500/20 text-red-400',
  LOST: 'bg-slate-700 text-slate-400',
}

export function CardsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewCardForm>(EMPTY)
  const [clientSearch, setClientSearch] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<PaginatedResponse<Card>>({
    queryKey: ['cards', page, search],
    queryFn: async () =>
      (await api.get('/cards', { params: { page, limit: 20, search: search || undefined } })).data,
  })

  const { data: clients } = useQuery<PaginatedResponse<Client>>({
    queryKey: ['clients-select', clientSearch],
    queryFn: async () =>
      (await api.get('/clients', { params: { limit: 20, search: clientSearch || undefined } })).data,
    enabled: showModal,
  })

  const create = useMutation({
    mutationFn: (body: NewCardForm) => api.post('/cards', { ...body, clientId: body.clientId || undefined }),
    onSuccess: () => {
      toast.success('Cartão criado!')
      qc.invalidateQueries({ queryKey: ['cards'] })
      setShowModal(false)
      setForm(EMPTY)
      setClientSearch('')
    },
    onError: () => toast.error('Erro ao criar cartão'),
  })

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Cartões</h1>
          <p className="text-slate-400 text-sm mt-1">{data?.total ?? 0} cartões cadastrados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Novo Cartão
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por UID ou label..."
          className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
        />
      </div>

      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              <th className="px-4 py-3 text-slate-400 font-medium">UID</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Label</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Status</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Participante</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="text-center py-10 text-slate-500">Carregando...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-slate-500">Nenhum cartão encontrado</td></tr>
            ) : (
              data?.data.map((card) => (
                <tr key={card.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-100">{card.uid}</td>
                  <td className="px-4 py-3 text-slate-300">{card.label || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[card.status]}`}>
                      {card.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {card.client ? (
                      <Link
                        to={`/clients/${card.client.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-indigo-400 hover:text-indigo-300"
                      >
                        {card.client.name}
                      </Link>
                    ) : '—'}
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

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Novo Cartão</h2>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">UID *</label>
                <input
                  required
                  value={form.uid}
                  onChange={(e) => setForm({ ...form, uid: e.target.value })}
                  placeholder="Ex: A1B2C3D4"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Label</label>
                <input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Ex: Cartão Principal"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as NewCardForm['status'] })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="BLOCKED">BLOCKED</option>
                  <option value="LOST">LOST</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Participante</label>
                <input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Buscar participante..."
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500 mb-2"
                />
                <select
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sem participante</option>
                  {clients?.data.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setForm(EMPTY); setClientSearch('') }} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={create.isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                  {create.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
