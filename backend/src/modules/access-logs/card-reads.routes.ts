import { Router, Request, Response } from 'express'
import axios from 'axios'
import prisma from '../../lib/prisma'
import { deviceAuth } from '../../middlewares/device-auth.middleware'
import { emitToTenant } from '../../config/socket'

const router = Router()

/**
 * Haversine formula — returns distance in metres between two GPS coordinates.
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000 // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

router.post('/', deviceAuth, async (req: Request, res: Response) => {
  try {
    const { uid, lat, lng } = req.body
    if (!uid) return res.status(400).json({ error: 'uid required' })

    const tenantId = req.tenantId!
    const device = req.device!
    const cardUid = (uid as string).toUpperCase()

    // ── Location check ──────────────────────────────────────────────────────
    // Fetch settings early so we can validate before any heavy DB work
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } })

    if (settings?.locationCheckEnabled) {
      // Coordinates: prefer those sent in the request body; fall back to the
      // device's pre-configured coordinates set by the admin.
      const checkLat = lat != null ? parseFloat(lat) : device.latitude
      const checkLng = lng != null ? parseFloat(lng) : device.longitude

      if (checkLat == null || checkLng == null || isNaN(checkLat) || isNaN(checkLng)) {
        return res.status(403).json({
          error: 'Localização não disponível. Configure as coordenadas GPS do dispositivo nas definições.',
        })
      }

      if (settings.checkInLat == null || settings.checkInLng == null) {
        return res.status(403).json({
          error: 'Ponto de referência do estabelecimento não configurado. Vá a Definições → Localização.',
        })
      }

      const distance = haversineDistance(checkLat, checkLng, settings.checkInLat, settings.checkInLng)
      const radius = settings.checkInRadius ?? 50

      if (distance > radius) {
        return res.status(403).json({
          error: `Fora do raio permitido. Distância: ${Math.round(distance)}m (máximo: ${radius}m).`,
          distance: Math.round(distance),
          radius,
        })
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // 1. Determine direction from last log
    const lastLog = await prisma.accessLog.findFirst({
      where: { cardUid, tenantId },
      orderBy: { occurredAt: 'desc' },
    })

    // 2. Find card
    const card = await prisma.card.findFirst({
      where: { uid: cardUid, tenantId },
      include: { client: true },
    })

    // 3. Determine event type and direction
    let eventType: 'ENTRY' | 'EXIT' | 'UNKNOWN_CARD' | 'BLOCKED_CARD'
    let direction: 'IN' | 'OUT'

    if (!card) {
      eventType = 'UNKNOWN_CARD'
      direction = 'IN'
    } else if (card.status === 'BLOCKED') {
      eventType = 'BLOCKED_CARD'
      direction = 'IN'
    } else if (lastLog?.direction === 'IN') {
      eventType = 'EXIT'
      direction = 'OUT'
    } else {
      eventType = 'ENTRY'
      direction = 'IN'
    }

    // 4. Store validated coordinates (from request or device config)
    const logLat = lat != null ? parseFloat(lat) : (device.latitude ?? null)
    const logLng = lng != null ? parseFloat(lng) : (device.longitude ?? null)

    // 5. Create AccessLog + update card.lastSeenAt
    const [log] = await Promise.all([
      prisma.accessLog.create({
        data: {
          tenantId,
          cardUid,
          eventType,
          direction,
          clientId: card?.clientId ?? null,
          deviceId: device.id,
          rawPayload: JSON.stringify(req.body),
          latitude: logLat && !isNaN(logLat) ? logLat : null,
          longitude: logLng && !isNaN(logLng) ? logLng : null,
        },
        include: {
          client: { select: { id: true, name: true, phone: true } },
          device: { select: { id: true, name: true, location: true } },
        },
      }),
      card
        ? prisma.card.update({ where: { id: card.id }, data: { lastSeenAt: new Date() } })
        : Promise.resolve(null),
    ])

    // 6. Emit socket event
    emitToTenant(tenantId, 'access:new', log)

    // 7. WhatsApp notification (fire-and-forget)
    if (card?.client && (eventType === 'ENTRY' || eventType === 'EXIT')) {
      const shouldNotify = eventType === 'ENTRY' ? settings?.notifyOnEntry : settings?.notifyOnExit
      if (
        shouldNotify &&
        settings?.whatsappApiUrl &&
        settings?.whatsappInstanceId &&
        settings?.whatsappToken
      ) {
        const msg =
          eventType === 'ENTRY'
            ? `✅ *${card.client.name}* registrou *entrada* agora.`
            : `👋 *${card.client.name}* registrou *saída* agora.`
        axios
          .post(
            `${settings.whatsappApiUrl}/message/sendText/${settings.whatsappInstanceId}`,
            { number: card.client.phone, text: msg },
            { headers: { Authorization: `Bearer ${settings.whatsappToken}` } }
          )
          .catch((err) => console.error('[WhatsApp] Send failed:', err.message))
      }
    }

    return res.json({ success: true, eventType, client: card?.client ?? null })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
