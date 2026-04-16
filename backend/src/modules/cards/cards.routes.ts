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
    if (search) where.OR = [{ uid: { contains: search, mode: 'insensitive' } }, { label: { contains: search, mode: 'insensitive' } }]
    const [data, total] = await Promise.all([
      prisma.card.findMany({ where, skip: (page - 1) * limit, take: limit, include: { client: true }, orderBy: { createdAt: 'desc' } }),
      prisma.card.count({ where }),
    ])
    return res.json({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

router.post('/', planLimits('cards'), async (req: Request, res: Response) => {
  try {
    const { uid, label, status, clientId } = req.body
    if (!uid) return res.status(400).json({ error: 'uid required' })
    return res.status(201).json(await prisma.card.create({ data: { tenantId: req.user.tenantId, uid: uid.toUpperCase(), label: label || null, status: status || 'ACTIVE', clientId: clientId || null } }))
  } catch (err: any) {
    if (err?.code === 'P2002') return res.status(409).json({ error: 'Card UID already exists' })
    console.error(err); return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const c = await prisma.card.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId }, include: { client: true } })
    if (!c) return res.status(404).json({ error: 'Not found' })
    return res.json(c)
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { label, status, clientId } = req.body
    const r = await prisma.card.updateMany({ where: { id: req.params.id, tenantId: req.user.tenantId }, data: { label: label ?? undefined, status: status ?? undefined, clientId: clientId === '' ? null : clientId ?? undefined } })
    if (r.count === 0) return res.status(404).json({ error: 'Not found' })
    return res.json(await prisma.card.findUnique({ where: { id: req.params.id }, include: { client: true } }))
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

export default router
