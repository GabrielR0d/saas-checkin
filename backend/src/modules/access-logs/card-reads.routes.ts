import { Router, Request, Response } from 'express'
import prisma from '../../lib/prisma'
import { deviceAuth } from '../../middlewares/device-auth.middleware'
import { emitToTenant } from '../../config/socket'
import { sendWaMsg } from '../../lib/whatsapp'
import { sendPush } from '../../lib/push'

const router = Router()

router.post('/', deviceAuth, async (req: Request, res: Response) => {
  try {
    const { uid } = req.body
    if (!uid) return res.status(400).json({ error: 'uid obrigatório' })

    const tenantId = req.tenantId!
    const device = req.device!
    const cardUid = String(uid).trim().toUpperCase()
    if (!cardUid || cardUid.length > 64) {
      return res.status(400).json({ error: 'uid inválido' })
    }

    // 2. Find card first (needed for clientId-based direction lookup)
    const card = await prisma.card.findFirst({
      where: { uid: cardUid, tenantId },
      include: { client: { select: { id: true, name: true, phone: true, phoneNumber: true } } },
    })

    // 1. Determine direction from last log — use clientId when known so WhatsApp
    //    check-ins count towards the RFID direction and vice-versa.
    const lastLog = await prisma.accessLog.findFirst({
      where: card?.clientId
        ? { clientId: card.clientId, tenantId }
        : { cardUid, tenantId },
      orderBy: { occurredAt: 'desc' },
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

    // 4. Create AccessLog + update card.lastSeenAt
    const [log] = await Promise.all([
      prisma.accessLog.create({
        data: {
          tenantId,
          cardUid,
          eventType,
          direction,
          clientId: card?.clientId ?? null,
          cardId: card?.id ?? null,
          deviceId: device.id,
          rawPayload: JSON.stringify(req.body),
          checkinSource: 'rfid',
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

    // 5. Emit socket event
    emitToTenant(tenantId, 'access:new', log)

    // 6. WhatsApp + Push notifications (fire-and-forget)
    if (card?.client && (eventType === 'ENTRY' || eventType === 'EXIT')) {
      const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } })
      const shouldNotify = eventType === 'ENTRY' ? settings?.notifyOnEntry : settings?.notifyOnExit
      const time = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' })

      // WhatsApp message to the client
      const waNumber = card.client.phoneNumber || card.client.phone?.replace(/\D/g, '')
      if (shouldNotify && settings?.whatsappEnabled && settings?.whatsappApiUrl && waNumber) {
        const msg = eventType === 'ENTRY'
          ? `✅ Entrada às ${time}. Bem-vindo(a), *${card.client.name}*!`
          : `👋 Saída às ${time}. Até logo, *${card.client.name}*!`
        sendWaMsg(waNumber, msg, settings)
          .then((sent) => {
            if (sent) {
              prisma.accessLog.update({ where: { id: log.id }, data: { whatsappSent: true } }).catch(() => {})
            }
          })
          .catch((err) => console.error('[WhatsApp] Send failed:', err.message))
      }

      // Push notification to the admin mobile app
      if (shouldNotify && settings?.pushToken) {
        sendPush(settings.pushToken, {
          title: eventType === 'ENTRY' ? '✅ Entrada' : '👋 Saída',
          body: `${card.client.name} — ${time}`,
          data: { logId: log.id, clientId: card.client.id },
        })
      }
    }

    return res.json({ success: true, eventType, client: card?.client ?? null })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
