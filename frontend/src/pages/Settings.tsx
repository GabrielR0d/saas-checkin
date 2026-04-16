import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QrCode, Wifi, X } from 'lucide-react'
import { getSettings, updateSettings, getWhatsappQrCode } from '../api'
import type { TenantSettings } from '../types'

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const qc = useQueryClient()
  const [qrModal, setQrModal] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [waForm, setWaForm] = useState({
    whatsappProvider: 'EVOLUTION',
    whatsappInstanceId: '',
    whatsappToken: '',
    whatsappApiUrl: '',
  })

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    onSuccess: (d: TenantSettings) => {
      setWaForm({
        whatsappProvider: d.whatsappProvider ?? 'EVOLUTION',
        whatsappInstanceId: d.whatsappInstanceId ?? '',
        whatsappToken: d.whatsappToken ?? '',
        whatsappApiUrl: d.whatsappApiUrl ?? '',
      })
    },
  } as Parameters<typeof useQuery>[0])

  const mutation = useMutation({
    mutationFn: (data: Partial<TenantSettings>) => updateSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })

  const handleToggle = (key: keyof TenantSettings) => (value: boolean) => {
    mutation.mutate({ [key]: value })
  }

  const handleQrCode = async () => {
    setQrModal(true)
    try {
      const { qrcode } = await getWhatsappQrCode()
      setQrCode(qrcode)
    } catch {
      setQrCode(null)
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Configurações</h1>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Notificações</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { key: 'notifyOnEntry', label: 'Notificar entradas' },
            { key: 'notifyOnExit', label: 'Notificar saídas' },
            { key: 'notifyOnUnknown', label: 'Notificar cartões desconhecidos' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between px-6 py-4">
              <span className="text-sm text-gray-700">{label}</span>
              <Toggle
                checked={!!(settings as TenantSettings | undefined)?.[key as keyof TenantSettings]}
                onChange={handleToggle(key as keyof TenantSettings)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-500" />
            WhatsApp
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provedor</label>
            <select
              value={waForm.whatsappProvider}
              onChange={(e) => setWaForm((p) => ({ ...p, whatsappProvider: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EVOLUTION">Evolution API</option>
              <option value="ZAPI">Z-API</option>
            </select>
          </div>
          {[
            { key: 'whatsappInstanceId', label: 'Instance ID', placeholder: 'minha-instancia' },
            { key: 'whatsappToken', label: 'Token', placeholder: '••••••••' },
            { key: 'whatsappApiUrl', label: 'API URL', placeholder: 'https://api.meuservidor.com' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="text"
                value={waForm[key as keyof typeof waForm]}
                onChange={(e) => setWaForm((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <div className="flex gap-3">
            <button
              onClick={() => mutation.mutate(waForm)}
              disabled={mutation.isPending}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={handleQrCode}
              className="flex items-center gap-2 border border-gray-200 text-gray-600 rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
            >
              <QrCode className="w-4 h-4" /> QR Code
            </button>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Conectar WhatsApp</h3>
              <button onClick={() => setQrModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {qrCode ? (
              <img src={`data:image/png;base64,${qrCode}`} alt="QR Code WhatsApp" className="w-full rounded-lg" />
            ) : (
              <p className="text-sm text-gray-500 py-8">Aguardando QR Code...</p>
            )}
            <p className="text-xs text-gray-400">Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo</p>
          </div>
        </div>
      )}
    </div>
  )
}
