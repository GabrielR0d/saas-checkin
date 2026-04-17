import { Router } from 'express'
import { stringify } from 'csv-stringify'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'

const router = Router()
router.use(authenticate)

router.get('/summary', async (req, res) => {
  try {
    const tenantId = req.user.tenantId
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalClients, totalCards, totalDevices, todayEntries, todayExits, unknownCards] = await Promise.all([
      prisma.client.count({ where: { tenantId } }),
      prisma.card.count({ where: { tenantId } }),
      prisma.device.count({ where: { tenantId } }),
      prisma.accessLog.count({ where: { tenantId, eventType: 'ENTRY', occurredAt: { gte: today } } }),
      prisma.accessLog.count({ where: { tenantId, eventType: 'EXIT', occurredAt: { gte: today } } }),
      prisma.accessLog.count({ where: { tenantId, eventType: 'UNKNOWN_CARD', occurredAt: { gte: today } } }),
    ])

    return res.json({ totalClients, totalCards, totalDevices, todayEntries, todayExits, unknownCards })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/export/csv', async (req, res) => {
  try {
    const { eventType, clientId, deviceId, dateFrom, dateTo } = req.query as Record<string, string>
    const tenantId = req.user.tenantId
    const where: any = { tenantId }
    if (eventType) where.eventType = eventType
    if (clientId) where.clientId = clientId
    if (deviceId) where.deviceId = deviceId
    if (dateFrom || dateTo) {
      where.occurredAt = {}
      if (dateFrom) where.occurredAt.gte = new Date(dateFrom)
      if (dateTo) where.occurredAt.lte = new Date(dateTo)
    }

    const logs = await prisma.accessLog.findMany({ where, include: { client: true, device: true }, orderBy: { occurredAt: 'desc' }, take: 10000 })

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="access-logs.csv"')
    res.write('\uFEFF') // UTF-8 BOM

    const stringifier = stringify({
      header: true,
      columns: ['occurredAt', 'eventType', 'cardUid', 'clientName', 'clientPhone', 'deviceName', 'whatsappSent'],
    })
    stringifier.pipe(res)

    for (const log of logs) {
      stringifier.write({
        occurredAt: log.occurredAt.toISOString(),
        eventType: log.eventType,
        cardUid: log.cardUid,
        clientName: log.client?.name || '',
        clientPhone: log.client?.phone || '',
        deviceName: log.device?.name || '',
        whatsappSent: log.whatsappSent ? 'Sim' : 'Não',
      })
    }
    stringifier.end()
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
