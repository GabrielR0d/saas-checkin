import { Router, Request, Response } from 'express'
import prisma from '../../lib/prisma'
import { authenticate } from '../../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/', async (req: Request, res: Response) => {
  try { return res.json(await prisma.tenantSettings.findUnique({ where: { tenantId: req.user.tenantId } })) }
  catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

router.patch('/', async (req: Request, res: Response) => {
  try {
    const { notifyOnEntry, notifyOnExit, notifyOnUnknown, whatsappProvider, whatsappInstanceId, whatsappToken, whatsappApiUrl } = req.body
    return res.json(await prisma.tenantSettings.upsert({ where: { tenantId: req.user.tenantId }, update: { notifyOnEntry, notifyOnExit, notifyOnUnknown, whatsappProvider, whatsappInstanceId, whatsappToken, whatsappApiUrl }, create: { tenantId: req.user.tenantId, notifyOnEntry, notifyOnExit, notifyOnUnknown, whatsappProvider, whatsappInstanceId, whatsappToken, whatsappApiUrl } }))
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

router.patch('/push-token', async (req: Request, res: Response) => {
  try {
    return res.json(await prisma.tenantSettings.upsert({ where: { tenantId: req.user.tenantId }, update: { pushToken: req.body.pushToken }, create: { tenantId: req.user.tenantId, pushToken: req.body.pushToken } }))
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

export default router
