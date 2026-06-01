import { Router, Request, Response } from 'express'
import axios from 'axios'
import prisma from '../../lib/prisma'
import { deviceAuth } from '../../middlewares/device-auth.middleware'
import { emitToTenant } from '../../config/socket'

const router = Router()

router.post('/', deviceAuth, async (req: Request, res: Response) => {
  try {
    const { uid } = req.body
    if (!uid) return res.status(400).json({ error: 'uid required' })

    const tenantId = req.tenantId!
    const device = req.device!
    const cardUid = (uid as string).toUpperCase()

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

    // 4. Create AccessLog + update card.lastSeenAt
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

    // 6. WhatsApp notification (fire-and-forget)
    if (card?.client && (eventType === 'ENTRY' || eventType === 'EXIT')) {
      const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } })
      const shouldNotify = eventType === 'ENTRY' ? settings?.notifyOnEntry : settings?.notifyOnExit

      if (shouldNotify && settings?.whatsappApiUrl && settings?.whatsappInstanceId && settings?.whatsappToken) {
        const msg = eventType === 'ENTRY'
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
