import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Copy, Check, MapPin, Locate, Search, Wifi, WifiOff, QrCode, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import type { Settings } from '../types'

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1'
const WEBHOOK_URL = API_BASE.replace(/\/api\/v1\/?$/, '') + '/api/v1/whatsapp/webhook'

function useDebounce<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function SettingsPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState<Settings>({
    notifyOnEntry: true,
    notifyOnExit: false,
    notifyOnUnknown: true,
    whatsappProvider: 'EVOLUTION',
    whatsappInstanceId: '',
    whatsappToken: '',
    whatsappApiUrl: '',
    whatsappEnabled: false,
    locationLat: null,
    locationLng: null,
    locationRadius: 100,
  })
  const [copied, setCopied] = useState(false)
  const [addressQuery, setAddressQuery] = useState('')
  const [geoLocating, setGeoLocating] = useState(false)
  const [addressSearching, setAddressSearching] = useState(false)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)
  const debouncedAddress = useDebounce(addressQuery, 700)
  const mapRef = useRef<HTMLIFrameElement>(null)

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data,
  })

  // WhatsApp connection status — only poll when API URL is configured
  const hasWaConfig = !!(settings?.whatsappApiUrl && settings?.whatsappInstanceId)
  const { data: waStatus, refetch: refetchWaStatus, isFetching: waStatusFetching } = useQuery<any>({
    queryKey: ['whatsapp-status'],
    queryFn: async () => (await api.get('/whatsapp/status')).data,
    enabled: hasWaConfig,
    refetchInterval: 30_000,
    retry: false,
  })

  // Derive connected state from Evolution API response
  const waInstances: any[] = Array.isArray(waStatus) ? waStatus : []
  const instanceName = settings?.whatsappInstanceId ?? ''
  const myInstance = waInstances.find(
    (i: any) => i.name === instanceName || i.instance?.instanceName === instanceName
  )
  const waConnected = myInstance?.state === 'open' || myInstance?.instance?.state === 'open'

  async function generateQr() {
    setLoadingQr(true)
    setQrImage(null)
    try {
      const { data } = await api.post('/whatsapp/qrcode')
      const b64 = data?.base64 ?? data?.qrcode?.base64 ?? data?.code
      if (b64) {
        setQrImage(b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`)
      } else {
        toast.error('QR Code não retornado pela API')
      }
    } catch {
      toast.error('Erro ao gerar QR Code')
    } finally {
      setLoadingQr(false)
    }
  }

  useEffect(() => {
    if (settings) {
      setForm({
        notifyOnEntry: settings.notifyOnEntry ?? true,
        notifyOnExit: settings.notifyOnExit ?? false,
        notifyOnUnknown: settings.notifyOnUnknown ?? true,
        whatsappProvider: settings.whatsappProvider ?? 'EVOLUTION',
        whatsappInstanceId: settings.whatsappInstanceId ?? '',
        whatsappToken: settings.whatsappToken ?? '',
        whatsappApiUrl: settings.whatsappApiUrl ?? '',
        whatsappEnabled: settings.whatsappEnabled ?? false,
        locationLat: settings.locationLat ?? null,
        locationLng: settings.locationLng ?? null,
        locationRadius: settings.locationRadius ?? 100,
      })
    }
  }, [settings])

  const save = useMutation({
    mutationFn: () => api.patch('/settings', form),
    onSuccess: () => {
      toast.success('Definições guardadas!')
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => toast.error('Erro ao guardar as definições'),
  })

  // Auto-search address when query changes
  useEffect(() => {
    if (!debouncedAddress || debouncedAddress.length < 5) return
    setAddressSearching(true)
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debouncedAddress)}&format=json&limit=1&countrycodes=pt`, {
      headers: { 'Accept-Language': 'pt-PT', 'User-Agent': 'saas-checkin/1.0' },
    })
      .then((r) => r.json())
      .then((results) => {
        if (results.length > 0) {
          const { lat, lon } = results[0]
          setForm((f) => ({ ...f, locationLat: parseFloat(lat), locationLng: parseFloat(lon) }))
          toast.success(`Localização encontrada: ${results[0].display_name.split(',').slice(0, 2).join(',')}`)
        } else {
          toast.error('Endereço não encontrado')
        }
      })
      .catch(() => toast.error('Erro ao buscar endereço'))
      .finally(() => setAddressSearching(false))
  }, [debouncedAddress])

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada neste navegador')
      return
    }
    setGeoLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          locationLat: parseFloat(pos.coords.latitude.toFixed(6)),
          locationLng: parseFloat(pos.coords.longitude.toFixed(6)),
        }))
        setGeoLocating(false)
        toast.success('Localização atual capturada!')
      },
      () => {
        setGeoLocating(false)
        toast.error('Não foi possível obter a localização')
      },
    )
  }

  function copyWebhook() {
    navigator.clipboard.writeText(WEBHOOK_URL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const hasLocation = form.locationLat != null && form.locationLng != null

  const mapSrc = hasLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${form.locationLng! - 0.003},${form.locationLat! - 0.002},${form.locationLng! + 0.003},${form.locationLat! + 0.002}&layer=mapnik&marker=${form.locationLat},${form.locationLng}`
    : null

  if (isLoading) {
    return <div className="p-6 text-slate-400">A carregar...</div>
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Definições</h1>
        <p className="text-slate-400 text-sm mt-1">Gerencie notificações e integrações</p>
      </div>

      {/* Notifications */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-100">Notificações</h2>
        {[
          { key: 'notifyOnEntry' as const, label: 'Notificar na entrada' },
          { key: 'notifyOnExit' as const, label: 'Notificar na saída' },
          { key: 'notifyOnUnknown' as const, label: 'Notificar cartão desconhecido' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-300">{label}</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, [key]: !form[key] })}
              className={`relative w-11 h-6 rounded-full transition-colors ${form[key] ? 'bg-indigo-600' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </label>
        ))}
      </div>

      {/* WhatsApp connection */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-100">WhatsApp — Conexão</h2>

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
          <label className="block text-sm font-medium text-slate-300 mb-1.5">API URL</label>
          <input
            type="url"
            value={form.whatsappApiUrl}
            onChange={(e) => setForm({ ...form, whatsappApiUrl: e.target.value })}
            placeholder="https://api.seudominio.com"
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
          />
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
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Token / API Key</label>
          <input
            type="password"
            value={form.whatsappToken}
            onChange={(e) => setForm({ ...form, whatsappToken: e.target.value })}
            placeholder="••••••••"
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
          />
        </div>

        {/* Webhook URL to configure on Evolution side */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            URL do Webhook
            <span className="ml-2 text-xs font-normal text-slate-500">(configure no painel da Evolution API)</span>
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={WEBHOOK_URL}
              className="flex-1 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none select-all"
            />
            <button
              type="button"
              onClick={copyWebhook}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition-colors shrink-0"
              title="Copiar URL"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Evento: <code className="text-slate-400">MESSAGES_UPSERT</code> · O cliente envia a localização pelo WhatsApp e este endpoint registra o check-in.
          </p>
        </div>
      </div>

      {/* WhatsApp connection status */}
      {hasWaConfig && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">Status da Conexão WhatsApp</h2>
            <button
              type="button"
              onClick={() => refetchWaStatus()}
              disabled={waStatusFetching}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              title="Atualizar status"
            >
              <RefreshCw size={15} className={waStatusFetching ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {waConnected ? (
              <>
                <Wifi size={20} className="text-green-400 shrink-0" />
                <span className="text-sm text-green-400 font-medium">Conectado</span>
              </>
            ) : (
              <>
                <WifiOff size={20} className="text-slate-500 shrink-0" />
                <span className="text-sm text-slate-400">Não conectado</span>
              </>
            )}
          </div>

          {!waConnected && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Escaneie o QR Code com o WhatsApp do número que enviará as notificações.
              </p>
              <button
                type="button"
                onClick={generateQr}
                disabled={loadingQr}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                <QrCode size={16} />
                {loadingQr ? 'Gerando...' : 'Gerar QR Code'}
              </button>
              {qrImage && (
                <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl w-fit">
                  <img src={qrImage} alt="QR Code WhatsApp" className="w-48 h-48 object-contain" />
                  <p className="text-xs text-slate-700">Escaneie com o WhatsApp</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* WhatsApp Check-in / Geofencing */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Check-in WhatsApp</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-slate-400">Habilitado</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, whatsappEnabled: !form.whatsappEnabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.whatsappEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.whatsappEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </label>
        </div>

        {/* Address search */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Buscar por endereço</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              placeholder="Ex: Rua das Flores, 123, Lisboa"
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
            />
            {addressSearching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 animate-pulse">buscando…</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">Digite o endereço do estabelecimento — lat/lng serão preenchidos automaticamente.</p>
        </div>

        {/* OR divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-xs text-slate-600">ou</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Geolocation button */}
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={geoLocating}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-slate-300 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Locate size={16} className={geoLocating ? 'animate-pulse text-indigo-400' : ''} />
          {geoLocating ? 'Obtendo localização...' : 'Usar minha localização atual'}
        </button>

        {/* Manual lat/lng + radius */}
        <div>
          <p className="text-sm font-medium text-slate-300 mb-2">Coordenadas e raio de geofence</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                <MapPin size={11} className="inline mr-1" />Latitude
              </label>
              <input
                type="number"
                step="any"
                value={form.locationLat ?? ''}
                onChange={(e) => setForm({ ...form, locationLat: e.target.value === '' ? null : parseFloat(e.target.value) })}
                placeholder="-23.5505"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Longitude</label>
              <input
                type="number"
                step="any"
                value={form.locationLng ?? ''}
                onChange={(e) => setForm({ ...form, locationLng: e.target.value === '' ? null : parseFloat(e.target.value) })}
                placeholder="-46.6333"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Raio (m)</label>
              <input
                type="number"
                min={10}
                max={5000}
                value={form.locationRadius}
                onChange={(e) => setForm({ ...form, locationRadius: parseFloat(e.target.value) || 100 })}
                placeholder="100"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* OSM map preview */}
        {hasLocation && mapSrc && (
          <div className="rounded-lg overflow-hidden border border-slate-700">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <MapPin size={12} className="text-indigo-400" />
                {form.locationLat?.toFixed(5)}, {form.locationLng?.toFixed(5)}
                <span className="text-slate-600">·</span>
                raio {form.locationRadius}m
              </span>
              <a
                href={`https://www.openstreetmap.org/?mlat=${form.locationLat}&mlon=${form.locationLng}&zoom=16`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                abrir mapa ↗
              </a>
            </div>
            <iframe
              ref={mapRef}
              src={mapSrc}
              title="Localização do estabelecimento"
              className="w-full h-48 border-0"
              loading="lazy"
            />
          </div>
        )}

        {!hasLocation && (
          <p className="text-xs text-slate-500 italic">
            Configure as coordenadas acima para ver o mapa e ativar o check-in por WhatsApp.
          </p>
        )}
      </div>

      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
      >
        <Save size={16} />
        {save.isPending ? 'A guardar...' : 'Guardar definições'}
      </button>
    </div>
  )
}
