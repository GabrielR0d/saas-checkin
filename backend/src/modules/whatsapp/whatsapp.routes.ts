import { Router, Request, Response } from 'express'
import axios from 'axios'
import prisma from '../../lib/prisma'
import { authenticate } from '../../middlewares/auth.middleware'
import { emitToTenant } from '../../config/socket'
import { rateLimit } from '../../middlewares/rate-limit.middleware'
import { sendWaMsg } from '../../lib/whatsapp'
import { sendPush } from '../../lib/push'

// 60 webhook calls per minute per IP (Evolution API sends bursts)
const webhookLimiter = rateLimit({ windowMs: 60_000, max: 60, message: 'Limite de pedidos excedido' })

const router = Router()

// ─── Helpers ────────────────────────────────────────────────────────────────

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Janela mínima entre check-ins do mesmo cliente: evita duplicidade por
// reenvio de webhook (retry da Evolution API) e por "localização em tempo
// real" do WhatsApp, que envia múltiplas atualizações de locationMessage
// para uma única sessão de compartilhamento.
const MIN_CHECKIN_INTERVAL_MS = 90 * 1000

// ─── Webhook público (sem autenticação) ─────────────────────────────────────

router.post('/webhook', webhookLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data } = req.body
    if (!data?.message?.locationMessage) {
      res.status(200).json({ ok: true })
      return
    }

    const remoteJid: string = data.key?.remoteJid ?? ''
    const rawPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '')
    const { degreesLatitude: lat, degreesLongitude: lng } = data.message.locationMessage

    if (!rawPhone || lat == null || lng == null) {
      res.status(200).json({ ok: true })
      return
    }

    // Portuguese mobile numbers are 9 digits (e.g. 912345678).
    // WhatsApp sends the international format: 351912345678.
    // We need to match regardless of whether the number was stored
    // with or without the +351 country code prefix.
    const phone9  = rawPhone.slice(-9)   // last 9 digits  → 912345678
    const phone11 = rawPhone.slice(-11)  // last 11 digits  (legacy BR format, kept for compat)

    // Identify which tenant this webhook belongs to via instance name.
    // (Evolution API sends { instance: "instanceName", data: { ... } } at top level)
    const instanceName: string | undefined = req.body.instance ?? req.body.instanceName
    const tenantSettingsByInstance = instanceName
      ? await prisma.tenantSettings.findFirst({ where: { whatsappInstanceId: instanceName } })
      : null

    // Build the where clause for client lookup.
    // If we know the tenant (via instance name), scope the search to that tenant to
    // support multi-tenant: the same phone number can exist in different tenants.
    const phoneWhere = {
      OR: [
        { phoneNumber: rawPhone },          // exact match (e.g. "351912345678")
        { phoneNumber: phone9 },            // stored without country code ("912345678")
        { phoneNumber: { endsWith: phone9 } },   // stored with any prefix
        { phoneNumber: phone11 },
        { phoneNumber: { endsWith: phone11 } },
      ],
      ...(tenantSettingsByInstance ? { tenantId: tenantSettingsByInstance.tenantId } : {}),
    }

    const client = await prisma.client.findFirst({
      where: phoneWhere,
      include: { tenant: { include: { settings: true } } },
    })

    if (!client) {
      // Reply using the tenant's settings (found via instance name) so the sender knows they're not registered.
      // Only reply if whatsapp is actually enabled for this tenant.
      if (tenantSettingsByInstance?.whatsappEnabled) {
        await sendWaMsg(rawPhone, '❌ Número não registado. Contacte o administrador.', tenantSettingsByInstance)
      }
      res.status(200).json({ ok: true })
      return
    }

    const s = client.tenant?.settings
    if (!s?.whatsappEnabled) {
      res.status(200).json({ ok: true })
      return
    }

    if (s?.locationLat == null || s?.locationLng == null) {
      await sendWaMsg(rawPhone, '❌ Localização do estabelecimento não configurada.', s)
      res.status(200).json({ ok: true })
      return
    }

    const dist = haversineDistance(lat, lng, s.locationLat, s.locationLng)
    const radius = s.locationRadius ?? 100

    if (dist > radius) {
      await sendWaMsg(rawPhone, `❌ Fora da área (${Math.round(dist)}m de distância, máximo ${radius}m).`, s)
      res.status(200).json({ ok: true })
      return
    }

    const last = await prisma.accessLog.findFirst({
      where: { clientId: client.id, tenantId: client.tenantId },
      orderBy: { occurredAt: 'desc' },
    })

    const now = new Date()

    if (last && now.getTime() - last.occurredAt.getTime() < MIN_CHECKIN_INTERVAL_MS) {
      // Provável reenvio de webhook ou atualização de "localização em tempo
      // real" da mesma sessão de compartilhamento — ignora sem duplicar.
      res.status(200).json({ ok: true })
      return
    }

    const direction = !last || last.direction === 'OUT' ? 'IN' : 'OUT'

    const created = await prisma.accessLog.create({
      data: {
        tenantId: client.tenantId,
        clientId: client.id,
        cardUid: null,
        direction: direction as any,
        eventType: (direction === 'IN' ? 'ENTRY' : 'EXIT') as any,
        occurredAt: now,
        latitude: lat,
        longitude: lng,
        checkinSource: 'whatsapp',
      },
    })

    const time = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' })
    const msg =
      direction === 'IN'
        ? `✅ Entrada às ${time}. Bem-vindo(a), ${client.name}!`
        : `✅ Saída às ${time}. Até logo, ${client.name}!`

    const sent = await sendWaMsg(rawPhone, msg, s)
    if (sent) {
      await prisma.accessLog.update({ where: { id: created.id }, data: { whatsappSent: true } })
    }

    // Push notification para a app mobile (fire-and-forget)
    sendPush(s.pushToken, {
      title: direction === 'IN' ? '✅ Entrada' : '👋 Saída',
      body: `${client.name} — ${time}`,
      data: { logId: created.id, clientId: client.id },
    })

    // Emite para o dashboard em tempo real
    emitToTenant(client.tenantId, 'access:new', {
      ...created,
      whatsappSent: sent,
      client: { id: client.id, name: client.name, phone: client.phone },
      device: null,
    })

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Webhook error:', err)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// ─── Rotas autenticadas ──────────────────────────────────────────────────────

router.use(authenticate)

async function getSettings(tenantId: string) {
  return prisma.tenantSettings.findUnique({ where: { tenantId } })
}

router.get('/status', async (req: Request, res: Response) => {
  try {
    const settings = await getSettings(req.user.tenantId)
    if (!settings?.whatsappApiUrl) return res.json({ connected: false })
    const apikey = settings.whatsappToken ?? process.env.EVOLUTION_API_KEY ?? ''
    const { data } = await axios.get(`${settings.whatsappApiUrl}/instance/fetchInstances`, {
      headers: { apikey },
    })
    return res.json(data)
  } catch (err: any) {
    return res.json({ connected: false, error: err.message })
  }
})

router.post('/connect', async (req: Request, res: Response) => {
  try {
    const settings = await getSettings(req.user.tenantId)
    if (!settings?.whatsappApiUrl || !settings.whatsappInstanceId) {
      return res.status(400).json({ error: 'WhatsApp não configurado' })
    }
    const apikey = settings.whatsappToken ?? process.env.EVOLUTION_API_KEY ?? ''
    const { data } = await axios.post(
      `${settings.whatsappApiUrl}/instance/create`,
      { instanceName: settings.whatsappInstanceId },
      { headers: { apikey } }
    )
    return res.json(data)
  } catch (err: any) {
    console.error('[WhatsApp] connect error:', err.message)
    return res.status(500).json({ error: 'Erro ao criar instância WhatsApp. Verifique as configurações.' })
  }
})

router.post('/qrcode', async (req: Request, res: Response) => {
  try {
    const settings = await getSettings(req.user.tenantId)
    if (!settings?.whatsappApiUrl || !settings.whatsappInstanceId) {
      return res.status(400).json({ error: 'WhatsApp não configurado' })
    }
    const apikey = settings.whatsappToken ?? process.env.EVOLUTION_API_KEY ?? ''
    const { data } = await axios.get(
      `${settings.whatsappApiUrl}/instance/connect/${settings.whatsappInstanceId}`,
      { headers: { apikey } }
    )
    return res.json(data)
  } catch (err: any) {
    console.error('[WhatsApp] qrcode error:', err.message)
    return res.status(500).json({ error: 'Erro ao obter QR Code. Verifique as configurações.' })
  }
})

export default router
