import { Router, Request, Response } from 'express'
import prisma from '../../lib/prisma'
import { authenticate } from '../../middlewares/auth.middleware'
import { planLimits } from '../../middlewares/plan-limits.middleware'

const router = Router()
router.use(authenticate)

router.get('/', async (req: Request, res: Response) => {
  try { return res.json({ data: await prisma.device.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { createdAt: 'desc' } }) })
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

router.post('/', planLimits('devices'), async (req: Request, res: Response) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'name required' })
    return res.status(201).json(await prisma.device.create({ data: { tenantId: req.user.tenantId, name: req.body.name, location: req.body.location || null, apiKey: crypto.randomUUID() } }))
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const d = await prisma.device.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } })
    if (!d) return res.status(404).json({ error: 'Not found' })
    return res.json(d)
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const r = await prisma.device.updateMany({ where: { id: req.params.id, tenantId: req.user.tenantId }, data: { name: req.body.name, location: req.body.location } })
    if (r.count === 0) return res.status(404).json({ error: 'Not found' })
    return res.json(await prisma.device.findUnique({ where: { id: req.params.id } }))
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

router.post('/:id/rotate-key', async (req: Request, res: Response) => {
  try {
    const r = await prisma.device.updateMany({ where: { id: req.params.id, tenantId: req.user.tenantId }, data: { apiKey: crypto.randomUUID() } })
    if (r.count === 0) return res.status(404).json({ error: 'Not found' })
    return res.json(await prisma.device.findUnique({ where: { id: req.params.id } }))
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

export default router
