import { Router, Request, Response } from 'express'
import { stringify } from 'csv-stringify'
import prisma from '../../lib/prisma'
import { authenticate } from '../../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const [totalClients, totalCards, totalDevices, todayEntries, todayExits, unknownCards] = await Promise.all([
      prisma.client.count({ where: { tenantId } }),
      prisma.card.count({ where: { tenantId } }),
      prisma.device.count({ where: { tenantId } }),
      prisma.accessLog.count({ where: { tenantId, eventType: 'ENTRY', occurredAt: { gte: today } } }),
      prisma.accessLog.count({ where: { tenantId, eventType: 'EXIT', occurredAt: { gte: today } } }),
      prisma.accessLog.count({ where: { tenantId, eventType: 'UNKNOWN_CARD', occurredAt: { gte: today } } }),
    ])
    return res.json({ totalClients, totalCards, totalDevices, todayEntries, todayExits, unknownCards })
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId
    const where: any = { tenantId }
    if (req.query.eventType) where.eventType = req.query.eventType
    if (req.query.clientId) where.clientId = req.query.clientId
    if (req.query.deviceId) where.deviceId = req.query.deviceId
    if (req.query.dateFrom || req.query.dateTo) {
      where.occurredAt = {}
      if (req.query.dateFrom) where.occurredAt.gte = new Date(req.query.dateFrom as string)
      if (req.query.dateTo) where.occurredAt.lte = new Date(req.query.dateTo as string)
    }
    const logs = await prisma.accessLog.findMany({ where, include: { client: true, device: true }, orderBy: { occurredAt: 'desc' }, take: 50000 })
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="registros.csv"')
    res.write('\uFEFF')
    const s = stringify({ header: true, columns: { occurredAt: 'Data/Hora', clientName: 'Cliente', clientPhone: 'Telefone', cardUid: 'UID Cartão', eventType: 'Evento', deviceName: 'Dispositivo' } })
    s.pipe(res)
    for (const log of logs) s.write({ occurredAt: log.occurredAt.toLocaleString('pt-BR'), clientName: log.client?.name ?? '', clientPhone: log.client?.phone ?? '', cardUid: log.cardUid, eventType: log.eventType, deviceName: log.device?.name ?? '' })
    s.end()
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

export default router
