import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronLeft, ChevronRight, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import type { Client, PaginatedResponse } from '../types'

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

interface NewClientForm {
  name: string
  phone: string
  phoneNumber: string
  email: string
  document: string
}

const EMPTY: NewClientForm = { name: '', phone: '', phoneNumber: '', email: '', document: '' }

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase()
    .replace(/^nome$/, 'name')
    .replace(/^telefone$|^phone$/, 'phone')
    .replace(/^whatsapp$|^phonenumber$/, 'phoneNumber')
    .replace(/^email$/, 'email')
    .replace(/^documento$|^document$|^nif$|^cc$/, 'document')
  )
  return lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  })
}

export function ClientsPage() {
  const [search, setSearch] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewClientForm>(EMPTY)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()
  const navigate = useNavigate()

  const debouncedSearch = useDebounce(search)

  const { data, isLoading } = useQuery<PaginatedResponse<Client>>({
    queryKey: ['clients', page, debouncedSearch, isActiveFilter],
    queryFn: async () =>
      (await api.get('/clients', {
        params: {
          page,
          limit: 20,
          search: debouncedSearch || undefined,
          isActive: isActiveFilter === '' ? undefined : isActiveFilter,
        },
      })).data,
  })

  const create = useMutation({
    mutationFn: (body: NewClientForm) => api.post('/clients', body),
    onSuccess: () => {
      toast.success('Participante criado!')
      qc.invalidateQueries({ queryKey: ['clients'] })
      setShowModal(false)
      setForm(EMPTY)
    },
    onError: (err: any) => {
      if (err?.response?.data?.error === 'PLAN_LIMIT') {
        toast.error(`Limite do plano atingido (${err.response.data.current}/${err.response.data.limit}). Faça upgrade em Planos.`)
      } else {
        toast.error(err?.response?.data?.error ?? 'Erro ao criar participante')
      }
    },
  })

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    try {
      const text = await file.text()
      const clients = parseCsv(text)
      if (!clients.length) { toast.error('Ficheiro CSV inválido ou vazio'); return }
      const res = await api.post('/clients/import', { clients })
      const { created, skipped, errors } = res.data
      if (errors?.length) {
        toast.error(`${created} criados, ${skipped} ignorados. Erros: ${errors.slice(0, 2).join('; ')}`)
      } else {
        toast.success(`${created} participantes importados${skipped ? `, ${skipped} ignorados` : ''}`)
      }
      qc.invalidateQueries({ queryKey: ['clients'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Erro ao importar CSV')
    } finally {
      setImporting(false)
    }
  }

  const totalPages = data?.meta?.totalPages ?? 1

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Participantes</h1>
          <p className="text-slate-400 text-sm mt-1">{data?.meta?.total ?? 0} participantes registados</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            title="Importar participantes via CSV (colunas: nome,telefone,whatsapp,email,documento)"
          >
            <Upload size={16} />
            {importing ? 'A importar...' : 'Importar CSV'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Novo
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Pesquisar por nome, email ou telefone..."
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
          />
        </div>
        <select
          value={isActiveFilter}
          onChange={(e) => { setIsActiveFilter(e.target.value); setPage(1) }}
          className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              <th className="px-4 py-3 text-slate-400 font-medium">Nome</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Telefone</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Email</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Documento</th>
              <th className="px-4 py-3 text-slate-400 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-500">A carregar...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-slate-500">Sem participantes encontrados</td></tr>
            ) : (
              data?.data.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-slate-100">{client.name}</td>
                  <td className="px-4 py-3 text-slate-300">
                    <span>{client.phone}</span>
                    {client.phoneNumber && (
                      <span className="ml-1.5 text-xs text-green-400" title={`WhatsApp: ${client.phoneNumber}`}>📱</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{client.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{client.document || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      client.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {client.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <span className="text-sm text-slate-400">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Novo Participante</h2>
            <form
              onSubmit={(e) => { e.preventDefault(); create.mutate(form) }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Telefone *</label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="912 345 678"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Telefone (WhatsApp)</label>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="351912345678"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Documento</label>
                <input
                  value={form.document}
                  onChange={(e) => setForm({ ...form, document: e.target.value })}
                  placeholder="NIF / CC"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(EMPTY) }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={create.isPending}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  {create.isPending ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
