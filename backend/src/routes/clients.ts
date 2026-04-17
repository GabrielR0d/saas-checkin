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
    if (search) {
      where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }]
    }
    const [data, total] = await Promise.all([
      prisma.client.findMany({ where, skip, take: parseInt(limit), include: { _count: { select: { cards: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.client.count({ where }),
    ])
    return res.json({ data, meta: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', planLimits('clients'), async (req, res) => {
  try {
    const { name, phone, email, document } = req.body
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' })
    const client = await prisma.client.create({ data: { tenantId: req.user.tenantId, name, phone, email, document } })
    return res.status(201).json(client)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const client = await prisma.client.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId }, include: { cards: true } })
    if (!client) return res.status(404).json({ error: 'Not found' })
    return res.json(client)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, document, isActive } = req.body
    const updated = await prisma.client.updateMany({ where: { id: req.params.id, tenantId: req.user.tenantId }, data: { name, phone, email, document, isActive } })
    if (updated.count === 0) return res.status(404).json({ error: 'Not found' })
    const client = await prisma.client.findFirst({ where: { id: req.params.id } })
    return res.json(client)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
