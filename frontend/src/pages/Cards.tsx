import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getCards, createCard, updateCard, getClients } from '../api'
import type { Card, CardStatus } from '../types'

const STATUS_BADGE: Record<CardStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-700',
  LOST: 'bg-yellow-100 text-yellow-700',
}
const STATUS_LABELS: Record<CardStatus, string> = { ACTIVE: 'Ativo', BLOCKED: 'Bloqueado', LOST: 'Perdido' }

function CardModal({ card, onClose }: { card?: Card; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    uid: card?.uid ?? '',
    label: card?.label ?? '',
    status: card?.status ?? 'ACTIVE' as CardStatus,
    clientId: card?.clientId ?? '',
  })

  const { data: clients } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => getClients({ limit: 200 }),
  })

  const mutation = useMutation({
    mutationFn: () =>
      card
        ? updateCard(card.id, { label: form.label, status: form.status, clientId: form.clientId || undefined })
        : createCard({ uid: form.uid.toUpperCase(), label: form.label, status: form.status, clientId: form.clientId || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cards'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{card ? 'Editar cartão' : 'Novo cartão'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">UID *</label>
            <input
              type="text"
              value={form.uid}
              onChange={(e) => setForm((p) => ({ ...p, uid: e.target.value.toUpperCase() }))}
              readOnly={!!card}
              required
              placeholder="A1B2C3D4"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="Ex: Cartão principal"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as CardStatus }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(['ACTIVE', 'BLOCKED', 'LOST'] as CardStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select
              value={form.clientId}
              onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Sem cliente —</option>
              {clients?.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function CardsPage() {
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<{ open: boolean; card?: Card }>({ open: false })

  const { data } = useQuery({
    queryKey: ['cards', page],
    queryFn: () => getCards({ page, limit: 20 }),
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Cartões</h1>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Novo cartão
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['UID', 'Descrição', 'Status', 'Cliente', 'Último uso', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data?.data?.map((card) => (
              <tr key={card.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{card.uid}</td>
                <td className="px-4 py-3 text-gray-600">{card.label ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[card.status]}`}>
                    {STATUS_LABELS[card.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{card.client?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {card.lastSeenAt
                    ? formatDistanceToNow(new Date(card.lastSeenAt), { addSuffix: true, locale: ptBR })
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setModal({ open: true, card })} className="text-gray-400 hover:text-gray-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.data?.length && (
          <p className="text-sm text-gray-400 text-center py-10">Nenhum cartão cadastrado.</p>
        )}
      </div>

      {(data?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {data?.total} cartões · página {page} de {data?.totalPages}
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

      {modal.open && <CardModal card={modal.card} onClose={() => setModal({ open: false })} />}
    </div>
  )
}
