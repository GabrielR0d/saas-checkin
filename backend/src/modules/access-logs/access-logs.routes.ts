import { Router, Request, Response } from 'express'
import prisma from '../../lib/prisma'
import { authenticate } from '../../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(200, parseInt(req.query.limit as string) || 20)
    const skip = (page - 1) * limit

    const where: any = { tenantId }
    if (req.query.eventType) where.eventType = req.query.eventType
    if (req.query.clientId) where.clientId = req.query.clientId
    if (req.query.deviceId) where.deviceId = req.query.deviceId
    if (req.query.dateFrom || req.query.dateTo) {
      where.occurredAt = {}
      if (req.query.dateFrom) where.occurredAt.gte = new Date(req.query.dateFrom as string)
      if (req.query.dateTo) where.occurredAt.lte = new Date(req.query.dateTo as string)
    }

    const [data, total] = await Promise.all([
      prisma.accessLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: { select: { id: true, name: true, phone: true } },
          device: { select: { id: true, name: true, location: true } },
        },
        orderBy: { occurredAt: 'desc' },
      }),
      prisma.accessLog.count({ where }),
    ])

    return res.json({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
