import { Router, Request, Response } from 'express'
import { stringify } from 'csv-stringify'
import prisma from '../../lib/prisma'
import { authenticate } from '../../middlewares/auth.middleware'
import { todayStartLisbon, dayStartLisbon, dayEndLisbon } from '../../lib/tz'

const router = Router()
router.use(authenticate)

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId
    const todayStart = todayStartLisbon()

    const [totalClients, activeClients, totalCards, totalDevices, onlineDevices, todayEntries, todayExits, unknownCards, todayWhatsappCheckins] =
      await Promise.all([
        prisma.client.count({ where: { tenantId } }),
        prisma.client.count({ where: { tenantId, isActive: true } }),
        prisma.card.count({ where: { tenantId } }),
        prisma.device.count({ where: { tenantId } }),
        prisma.device.count({ where: { tenantId, isOnline: true } }),
        prisma.accessLog.count({ where: { tenantId, eventType: 'ENTRY', occurredAt: { gte: todayStart } } }),
        prisma.accessLog.count({ where: { tenantId, eventType: 'EXIT', occurredAt: { gte: todayStart } } }),
        prisma.accessLog.count({ where: { tenantId, eventType: 'UNKNOWN_CARD', occurredAt: { gte: todayStart } } }),
        prisma.accessLog.count({ where: { tenantId, checkinSource: 'whatsapp', occurredAt: { gte: todayStart } } }),
      ])

    return res.json({ totalClients, activeClients, totalCards, totalDevices, onlineDevices, todayEntries, todayExits, unknownCards, todayWhatsappCheckins })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
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
      if (req.query.dateFrom) {
        const d = dayStartLisbon(req.query.dateFrom as string)
        if (!isNaN(d.getTime())) where.occurredAt.gte = d
      }
      if (req.query.dateTo) {
        const d = dayEndLisbon(req.query.dateTo as string)
        if (!isNaN(d.getTime())) where.occurredAt.lte = d
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

    const EVENT_PT: Record<string, string> = {
      ENTRY: 'Entrada',
      EXIT: 'Saída',
      UNKNOWN_CARD: 'Desconhecido',
      BLOCKED_CARD: 'Bloqueado',
    }

    stringifier.pipe(res)

    for (const log of logs) {
      stringifier.write({
        occurredAt: log.occurredAt.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }),
        clientName: log.client?.name ?? '',
        clientPhone: log.client?.phone ?? '',
        cardUid: log.cardUid ?? '',
        eventType: EVENT_PT[log.eventType] ?? log.eventType,
        checkinSource: log.checkinSource === 'whatsapp' ? 'WhatsApp' : 'RFID',
        deviceName: log.device?.name ?? '',
      })
    }
    stringifier.end()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
