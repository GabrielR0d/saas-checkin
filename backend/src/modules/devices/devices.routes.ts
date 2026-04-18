import { Router, Request, Response } from 'express'
import prisma from '../../lib/prisma'
import { authenticate } from '../../middlewares/auth.middleware'
import { planLimits } from '../../middlewares/plan-limits.middleware'

const router = Router()
router.use(authenticate)

router.get('/', async (req: Request, res: Response) => {
  try {
    const data = await prisma.device.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
    })
    return res.json({ data })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', planLimits('devices'), async (req: Request, res: Response) => {
  try {
    const { name, location } = req.body
    if (!name) return res.status(400).json({ error: 'name required' })
    const device = await prisma.device.create({
      data: { tenantId: req.user.tenantId, name, location: location || null, apiKey: crypto.randomUUID() },
    })
    return res.status(201).json(device)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const device = await prisma.device.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } })
    if (!device) return res.status(404).json({ error: 'Not found' })
    return res.json(device)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, location } = req.body
    const updated = await prisma.device.updateMany({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      data: { name: name ?? undefined, location: location ?? undefined },
    })
    if (updated.count === 0) return res.status(404).json({ error: 'Not found' })
    return res.json(await prisma.device.findUnique({ where: { id: req.params.id } }))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/rotate-key', async (req: Request, res: Response) => {
  try {
    const updated = await prisma.device.updateMany({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      data: { apiKey: crypto.randomUUID() },
    })
    if (updated.count === 0) return res.status(404).json({ error: 'Not found' })
    return res.json(await prisma.device.findUnique({ where: { id: req.params.id } }))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
