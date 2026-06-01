import { Router } from 'express'
import axios from 'axios'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { deviceAuth } from '../middleware/deviceAuth'
import { emitToTenant } from '../socket'

const router = Router()

router.get('/', authenticate, async (req, res) => {
  try {
    const { page = '1', limit = '20', eventType, clientId, deviceId, dateFrom, dateTo } = req.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const where: any = { tenantId: req.user.tenantId }
    if (eventType) where.eventType = eventType
    if (clientId) where.clientId = clientId
    if (deviceId) where.deviceId = deviceId
    if (dateFrom || dateTo) {
      where.occurredAt = {}
      if (dateFrom) where.occurredAt.gte = new Date(dateFrom)
      if (dateTo) where.occurredAt.lte = new Date(dateTo)
    }
    const [data, total] = await Promise.all([
      prisma.accessLog.findMany({ where, skip, take: parseInt(limit), include: { client: true, device: true }, orderBy: { occurredAt: 'desc' } }),
      prisma.accessLog.count({ where }),
    ])
    return res.json({ data, meta: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/card-reads', deviceAuth, async (req, res) => {
  try {
    const { uid } = req.body
    const tenantId = req.tenantId!
    const device = req.device!

    if (!uid) return res.status(400).json({ error: 'UID required' })

    const card = await prisma.card.findFirst({ where: { uid: uid.toUpperCase(), tenantId }, include: { client: true } })

    let eventType: 'ENTRY' | 'EXIT' | 'UNKNOWN_CARD' | 'BLOCKED_CARD'
    let direction: 'IN' | 'OUT'

    if (!card) {
      eventType = 'UNKNOWN_CARD'
      direction = 'IN'
    } else if (card.status === 'BLOCKED') {
      eventType = 'BLOCKED_CARD'
      direction = 'IN'
    } else {
      const lastLog = await prisma.accessLog.findFirst({ where: { cardUid: uid.toUpperCase(), tenantId }, orderBy: { occurredAt: 'desc' } })
      if (lastLog?.direction === 'IN') {
        eventType = 'EXIT'
        direction = 'OUT'
      } else {
        eventType = 'ENTRY'
        direction = 'IN'
      }
    }

    const log = await prisma.accessLog.create({
      data: { tenantId, cardUid: uid.toUpperCase(), eventType, direction, clientId: card?.clientId || null, deviceId: device.id, rawPayload: JSON.stringify(req.body) },
      include: { client: true, device: true },
    })

    if (card) {
      await prisma.card.update({ where: { id: card.id }, data: { lastSeenAt: new Date() } })
    }

    emitToTenant(tenantId, 'access:new', log)

    // WhatsApp notification (fire and forget)
    if (card?.client && (eventType === 'ENTRY' || eventType === 'EXIT')) {
      const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } })
      const shouldNotify = eventType === 'ENTRY' ? settings?.notifyOnEntry : settings?.notifyOnExit
      if (shouldNotify && settings?.whatsappApiUrl && settings?.whatsappInstanceId && settings?.whatsappToken) {
        const msg = eventType === 'ENTRY' ? `✅ ${card.client.name} entrou` : `👋 ${card.client.name} saiu`
        axios.post(`${settings.whatsappApiUrl}/message/sendText/${settings.whatsappInstanceId}`, {
          number: card.client.phone,
          text: msg,
        }, { headers: { apikey: settings.whatsappToken } }).catch(() => {})
      }
    }

    return res.json({ success: true, eventType, client: card?.client || null })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/heartbeat', deviceAuth, async (req, res) => {
  try {
    await prisma.device.update({ where: { id: req.device!.id }, data: { isOnline: true, lastHeartbeat: new Date() } })
    return res.json({ success: true })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
