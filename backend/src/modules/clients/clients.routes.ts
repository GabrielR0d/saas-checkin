import { Router, Request, Response } from 'express'
import prisma from '../../lib/prisma'
import { authenticate } from '../../middlewares/auth.middleware'
import { planLimits } from '../../middlewares/plan-limits.middleware'

const router = Router()
router.use(authenticate)

router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20)
    const search = req.query.search as string | undefined
    const where: any = { tenantId }
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }]
    const [data, total] = await Promise.all([
      prisma.client.findMany({ where, skip: (page - 1) * limit, take: limit, include: { _count: { select: { cards: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.client.count({ where }),
    ])
    return res.json({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

router.post('/', planLimits('clients'), async (req: Request, res: Response) => {
  try {
    const { name, phone, email, document } = req.body
    if (!name || !phone) return res.status(400).json({ error: 'name and phone required' })
    return res.status(201).json(await prisma.client.create({ data: { tenantId: req.user.tenantId, name, phone, email: email || null, document: document || null } }))
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const c = await prisma.client.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId }, include: { cards: true } })
    if (!c) return res.status(404).json({ error: 'Not found' })
    return res.json(c)
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, document, isActive } = req.body
    const r = await prisma.client.updateMany({ where: { id: req.params.id, tenantId: req.user.tenantId }, data: { name, phone, email: email ?? undefined, document: document ?? undefined, isActive: isActive ?? undefined } })
    if (r.count === 0) return res.status(404).json({ error: 'Not found' })
    return res.json(await prisma.client.findUnique({ where: { id: req.params.id } }))
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

export default router
