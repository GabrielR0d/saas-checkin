import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getDevices, createDevice, updateDevice, rotateDeviceKey } from '../api'
import type { Device } from '../types'

function DeviceModal({ device, onClose }: { device?: Device; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: device?.name ?? '', location: device?.location ?? '' })

  const mutation = useMutation({
    mutationFn: () =>
      device ? updateDevice(device.id, form) : createDevice(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['devices'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{device ? 'Editar leitor' : 'Novo leitor'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              placeholder="Leitor Principal"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Localização</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              placeholder="Entrada principal"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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

export default function DevicesPage() {
  const [modal, setModal] = useState<{ open: boolean; device?: Device }>({ open: false })
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [rotateConfirm, setRotateConfirm] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['devices'],
    queryFn: () => getDevices({ limit: 50 }),
    refetchInterval: 30_000,
  })

  const rotateMutation = useMutation({
    mutationFn: rotateDeviceKey,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['devices'] }); setRotateConfirm(null) },
  })

  const toggleReveal = (id: string) =>
    setRevealedKeys((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })

  const copyKey = (key: string) => navigator.clipboard.writeText(key)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Leitores</h1>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Novo leitor
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Nome', 'Localização', 'Online', 'Último heartbeat', 'API Key', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data?.data?.map((device) => {
              const revealed = revealedKeys.has(device.id)
              return (
                <tr key={device.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{device.name}</td>
                  <td className="px-4 py-3 text-gray-600">{device.location ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${device.isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${device.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                      {device.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {device.lastHeartbeat
                      ? formatDistanceToNow(new Date(device.lastHeartbeat), { addSuffix: true, locale: ptBR })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-600">
                        {revealed ? device.apiKey : '••••••••••••'}
                      </span>
                      <button onClick={() => toggleReveal(device.id)} className="text-gray-400 hover:text-gray-600">
                        {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => copyKey(device.apiKey)} className="text-gray-400 hover:text-gray-600">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setRotateConfirm(device.id)} className="text-gray-400 hover:text-orange-600">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setModal({ open: true, device })} className="text-gray-400 hover:text-gray-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!data?.data?.length && (
          <p className="text-sm text-gray-400 text-center py-10">Nenhum leitor cadastrado.</p>
        )}
      </div>

      {/* Rotate confirm dialog */}
      {rotateConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Rotacionar chave?</h3>
            <p className="text-sm text-gray-600">
              A chave atual será invalidada. O leitor precisará ser reconfigurado com a nova chave.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRotateConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => rotateMutation.mutate(rotateConfirm)}
                disabled={rotateMutation.isPending}
                className="flex-1 bg-orange-600 text-white rounded-lg py-2 text-sm hover:bg-orange-700 disabled:opacity-60"
              >
                {rotateMutation.isPending ? 'Rotacionando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.open && <DeviceModal device={modal.device} onClose={() => setModal({ open: false })} />}
    </div>
  )
}
