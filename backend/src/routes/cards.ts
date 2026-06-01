import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { planLimits } from '../middleware/planLimits'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { page = '1', limit = '20', search } = req.query as Record<string, string>
    const tenantId = req.user.tenantId
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const where: any = { tenantId }
    if (search) where.OR = [{ uid: { contains: search, mode: 'insensitive' } }, { label: { contains: search, mode: 'insensitive' } }]
    const [data, total] = await Promise.all([
      prisma.card.findMany({ where, skip, take: parseInt(limit), include: { client: true }, orderBy: { createdAt: 'desc' } }),
      prisma.card.count({ where }),
    ])
    return res.json({ data, meta: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', planLimits('cards'), async (req, res) => {
  try {
    const { uid, label, status, clientId } = req.body
    if (!uid) return res.status(400).json({ error: 'UID required' })
    const card = await prisma.card.create({ data: { tenantId: req.user.tenantId, uid: uid.toUpperCase(), label, status: status || 'ACTIVE', clientId: clientId || null } })
    return res.status(201).json(card)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const card = await prisma.card.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId }, include: { client: true } })
    if (!card) return res.status(404).json({ error: 'Not found' })
    return res.json(card)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { label, status, clientId } = req.body
    const updated = await prisma.card.updateMany({ where: { id: req.params.id, tenantId: req.user.tenantId }, data: { label, status, clientId: clientId || null } })
    if (updated.count === 0) return res.status(404).json({ error: 'Not found' })
    const card = await prisma.card.findFirst({ where: { id: req.params.id }, include: { client: true } })
    return res.json(card)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
