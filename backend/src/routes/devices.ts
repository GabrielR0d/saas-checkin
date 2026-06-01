import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { planLimits } from '../middleware/planLimits'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { createdAt: 'desc' } })
    return res.json({ data: devices })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', planLimits('devices'), async (req, res) => {
  try {
    const { name, location } = req.body
    if (!name) return res.status(400).json({ error: 'Name required' })
    const device = await prisma.device.create({ data: { tenantId: req.user.tenantId, name, location, apiKey: crypto.randomUUID() } })
    return res.status(201).json(device)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const device = await prisma.device.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } })
    if (!device) return res.status(404).json({ error: 'Not found' })
    return res.json(device)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { name, location } = req.body
    const updated = await prisma.device.updateMany({ where: { id: req.params.id, tenantId: req.user.tenantId }, data: { name, location } })
    if (updated.count === 0) return res.status(404).json({ error: 'Not found' })
    const device = await prisma.device.findFirst({ where: { id: req.params.id } })
    return res.json(device)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/rotate-key', async (req, res) => {
  try {
    const updated = await prisma.device.updateMany({ where: { id: req.params.id, tenantId: req.user.tenantId }, data: { apiKey: crypto.randomUUID() } })
    if (updated.count === 0) return res.status(404).json({ error: 'Not found' })
    const device = await prisma.device.findFirst({ where: { id: req.params.id } })
    return res.json(device)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
