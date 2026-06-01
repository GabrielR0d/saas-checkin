import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: req.user.tenantId } })
    return res.json(settings)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/', async (req, res) => {
  try {
    const { notifyOnEntry, notifyOnExit, notifyOnUnknown, whatsappProvider, whatsappInstanceId, whatsappToken, whatsappApiUrl } = req.body
    const settings = await prisma.tenantSettings.upsert({
      where: { tenantId: req.user.tenantId },
      update: { notifyOnEntry, notifyOnExit, notifyOnUnknown, whatsappProvider, whatsappInstanceId, whatsappToken, whatsappApiUrl },
      create: { tenantId: req.user.tenantId, notifyOnEntry, notifyOnExit, notifyOnUnknown, whatsappProvider, whatsappInstanceId, whatsappToken, whatsappApiUrl },
    })
    return res.json(settings)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/push-token', async (req, res) => {
  try {
    const { pushToken } = req.body
    const settings = await prisma.tenantSettings.update({ where: { tenantId: req.user.tenantId }, data: { pushToken } })
    return res.json(settings)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
