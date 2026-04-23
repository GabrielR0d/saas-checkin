import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, EyeOff, Copy, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import type { Device } from '../types'

interface NewDeviceForm {
  name: string
  location: string
}

const EMPTY: NewDeviceForm = { name: '', location: '' }

function timeAgo(dateStr?: string) {
  if (!dateStr) return 'nunca'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

export function DevicesPage() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewDeviceForm>(EMPTY)
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const qc = useQueryClient()

  const { data: devices, isLoading } = useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: async () => {
      const res = await api.get('/devices')
      return res.data?.data ?? res.data ?? []
    },
    refetchInterval: 30_000,
  })

  const create = useMutation({
    mutationFn: (body: NewDeviceForm) => api.post('/devices', { ...body, location: body.location || undefined }),
    onSuccess: () => {
      toast.success('Dispositivo criado!')
      qc.invalidateQueries({ queryKey: ['devices'] })
      setShowModal(false)
      setForm(EMPTY)
    },
    onError: () => toast.error('Erro ao criar dispositivo'),
  })

  const rotateKey = useMutation({
    mutationFn: (id: string) => api.post(`/devices/${id}/rotate-key`),
    onSuccess: () => {
      toast.success('Chave rotacionada!')
      qc.invalidateQueries({ queryKey: ['devices'] })
    },
    onError: () => toast.error('Erro ao rotacionar chave'),
  })

  function toggleReveal(id: string) {
    setRevealedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
    toast.success('Chave copiada!')
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dispositivos</h1>
          <p className="text-slate-400 text-sm mt-1">{devices?.length ?? 0} dispositivos cadastrados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Novo Dispositivo
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Carregando...</div>
      ) : !devices || devices.length === 0 ? (
        <div className="text-center py-12 text-slate-500">Nenhum dispositivo cadastrado</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.map((device) => {
            const revealed = revealedKeys.has(device.id)
            return (
              <div key={device.id} className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-100">{device.name}</h3>
                    {device.location && (
                      <p className="text-sm text-slate-400 mt-0.5">{device.location}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${device.isOnline ? 'bg-green-400' : 'bg-slate-600'}`} />
                    <span className={`text-xs font-medium ${device.isOnline ? 'text-green-400' : 'text-slate-500'}`}>
                      {device.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Último heartbeat: {timeAgo(device.lastHeartbeat)}
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400">API Key</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono truncate">
                      {revealed ? device.apiKey : '••••••••••••••••••••••••'}
                    </code>
                    <button
                      onClick={() => toggleReveal(device.id)}
                      className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
                      title={revealed ? 'Ocultar' : 'Mostrar'}
                    >
                      {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => copyKey(device.apiKey)}
                      className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Copiar"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (window.confirm('Rotacionar a chave? A chave atual será invalidada imediatamente.')) {
                      rotateKey.mutate(device.id)
                    }
                  }}
                  disabled={rotateKey.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  <RefreshCw size={14} />
                  Rotacionar Chave
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Novo Dispositivo</h2>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(form) }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Leitor Entrada Principal"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Localização</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Ex: Portão A"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setForm(EMPTY) }} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={create.isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                  {create.isPending ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
