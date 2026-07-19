import { Router, Request, Response } from 'express'
import { stringify } from 'csv-stringify'
import prisma from '../../lib/prisma'
import { authenticate } from '../../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

// Portugal observes Western European Time (WET = UTC+0 in winter, WEST = UTC+1 in summer).
// Render servers run in UTC, so we compute midnight-Lisbon in UTC to avoid
// the dashboard's "today" spanning from the previous day.
function todayStartLisbon(): Date {
  const TZ = 'Europe/Lisbon'
  // Today's date string in Lisbon timezone (sv-SE gives ISO "YYYY-MM-DD")
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: TZ })
  // Midnight UTC baseline for that date
  const midnight = new Date(`${today}T00:00:00Z`)
  // Hour in Lisbon at midnight UTC: 0 in winter (UTC+0), 1 in summer (UTC+1)
  const lisbonHour = +(new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: 'numeric', hour12: false,
  }).format(midnight)) || 0
  // Lisbon midnight in UTC = midnight UTC shifted back by lisbonHour hours
  return new Date(midnight.getTime() - lisbonHour * 3_600_000)
}

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId
    const todayStart = todayStartLisbon()

    const [totalClients, totalCards, totalDevices, onlineDevices, todayEntries, todayExits, unknownCards, todayWhatsappCheckins] =
      await Promise.all([
        prisma.client.count({ where: { tenantId } }),
        prisma.card.count({ where: { tenantId } }),
        prisma.device.count({ where: { tenantId } }),
        prisma.device.count({ where: { tenantId, isOnline: true } }),
        prisma.accessLog.count({ where: { tenantId, eventType: 'ENTRY', occurredAt: { gte: todayStart } } }),
        prisma.accessLog.count({ where: { tenantId, eventType: 'EXIT', occurredAt: { gte: todayStart } } }),
        prisma.accessLog.count({ where: { tenantId, eventType: 'UNKNOWN_CARD', occurredAt: { gte: todayStart } } }),
        prisma.accessLog.count({ where: { tenantId, checkinSource: 'whatsapp', occurredAt: { gte: todayStart } } }),
      ])

    return res.json({ totalClients, totalCards, totalDevices, onlineDevices, todayEntries, todayExits, unknownCards, todayWhatsappCheckins })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId
    const where: any = { tenantId }
    if (req.query.eventType) where.eventType = req.query.eventType
    if (req.query.clientId) where.clientId = req.query.clientId
    if (req.query.deviceId) where.deviceId = req.query.deviceId
    if (req.query.checkinSource) where.checkinSource = req.query.checkinSource
    if (req.query.dateFrom || req.query.dateTo) {
      where.occurredAt = {}
      if (req.query.dateFrom) where.occurredAt.gte = new Date(req.query.dateFrom as string)
      if (req.query.dateTo) {
        const d = new Date(req.query.dateTo as string)
        d.setUTCHours(23, 59, 59, 999)
        where.occurredAt.lte = d
      }
    }

    const logs = await prisma.accessLog.findMany({
      where,
      include: { client: true, device: true },
      orderBy: { occurredAt: 'desc' },
      take: 50000,
    })

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="registos.csv"')
    res.write('\uFEFF') // UTF-8 BOM

    const stringifier = stringify({
      header: true,
      columns: {
        occurredAt: 'Data/Hora',
        clientName: 'Cliente',
        clientPhone: 'Telefone',
        cardUid: 'UID Cartão',
        eventType: 'Evento',
        checkinSource: 'Origem',
        deviceName: 'Dispositivo',
      },
    })

    stringifier.pipe(res)

    for (const log of logs) {
      stringifier.write({
        occurredAt: log.occurredAt.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }),
        clientName: log.client?.name ?? '',
        clientPhone: log.client?.phone ?? '',
        cardUid: log.cardUid ?? '',
        eventType: log.eventType,
        checkinSource: log.checkinSource ?? 'rfid',
        deviceName: log.device?.name ?? '',
      })
    }
    stringifier.end()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
