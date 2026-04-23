import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import type { Settings } from '../types'

export function SettingsPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState<Settings>({
    notifyEntry: true,
    notifyExit: false,
    notifyUnknown: true,
    whatsappProvider: 'EVOLUTION',
    whatsappInstanceId: '',
    whatsappToken: '',
    whatsappApiUrl: '',
  })

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data,
  })

  useEffect(() => {
    if (settings) {
      setForm({
        notifyEntry: settings.notifyEntry ?? true,
        notifyExit: settings.notifyExit ?? false,
        notifyUnknown: settings.notifyUnknown ?? true,
        whatsappProvider: settings.whatsappProvider ?? 'EVOLUTION',
        whatsappInstanceId: settings.whatsappInstanceId ?? '',
        whatsappToken: settings.whatsappToken ?? '',
        whatsappApiUrl: settings.whatsappApiUrl ?? '',
      })
    }
  }, [settings])

  const save = useMutation({
    mutationFn: () => api.patch('/settings', form),
    onSuccess: () => {
      toast.success('Configurações salvas!')
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => toast.error('Erro ao salvar configurações'),
  })

  if (isLoading) {
    return <div className="p-6 text-slate-400">Carregando...</div>
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Configurações</h1>
        <p className="text-slate-400 text-sm mt-1">Gerencie notificações e integrações</p>
      </div>

      {/* Notifications */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-100">Notificações</h2>

        {[
          { key: 'notifyEntry' as const, label: 'Notificar na entrada' },
          { key: 'notifyExit' as const, label: 'Notificar na saída' },
          { key: 'notifyUnknown' as const, label: 'Notificar cartão desconhecido' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-300">{label}</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, [key]: !form[key] })}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form[key] ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form[key] ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        ))}
      </div>

      {/* WhatsApp */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-100">WhatsApp</h2>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Provedor</label>
          <select
            value={form.whatsappProvider}
            onChange={(e) => setForm({ ...form, whatsappProvider: e.target.value as Settings['whatsappProvider'] })}
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="EVOLUTION">Evolution API</option>
            <option value="ZAPI">Z-API</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Instance ID</label>
          <input
            type="text"
            value={form.whatsappInstanceId}
            onChange={(e) => setForm({ ...form, whatsappInstanceId: e.target.value })}
            placeholder="Ex: my-instance"
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Token</label>
          <input
            type="password"
            value={form.whatsappToken}
            onChange={(e) => setForm({ ...form, whatsappToken: e.target.value })}
            placeholder="••••••••"
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">API URL</label>
          <input
            type="url"
            value={form.whatsappApiUrl}
            onChange={(e) => setForm({ ...form, whatsappApiUrl: e.target.value })}
            placeholder="https://api.seudominio.com"
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
          />
        </div>
      </div>

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
      >
        <Save size={16} />
        {save.isPending ? 'Salvando...' : 'Salvar configurações'}
      </button>
    </div>
  )
}
