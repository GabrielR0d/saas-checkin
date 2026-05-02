import { Router, Request, Response } from 'express'
import prisma from '../../lib/prisma'
import { authenticate } from '../../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: req.user.tenantId },
    })
    return res.json(settings)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/', async (req: Request, res: Response) => {
  try {
    const {
      notifyOnEntry,
      notifyOnExit,
      notifyOnUnknown,
      whatsappProvider,
      whatsappInstanceId,
      whatsappToken,
      whatsappApiUrl,
      locationCheckEnabled,
      checkInLat,
      checkInLng,
      checkInRadius,
    } = req.body

    const lat = checkInLat != null ? parseFloat(checkInLat) : undefined
    const lng = checkInLng != null ? parseFloat(checkInLng) : undefined
    const radius = checkInRadius != null ? parseInt(checkInRadius, 10) : undefined

    const data = {
      notifyOnEntry,
      notifyOnExit,
      notifyOnUnknown,
      whatsappProvider,
      whatsappInstanceId,
      whatsappToken,
      whatsappApiUrl,
      locationCheckEnabled,
      checkInLat: lat !== undefined ? (isNaN(lat) ? null : lat) : undefined,
      checkInLng: lng !== undefined ? (isNaN(lng) ? null : lng) : undefined,
      checkInRadius: radius !== undefined ? (isNaN(radius) ? 50 : radius) : undefined,
    }

    const settings = await prisma.tenantSettings.upsert({
      where: { tenantId: req.user.tenantId },
      update: data,
      create: { tenantId: req.user.tenantId, ...data },
    })
    return res.json(settings)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/push-token', async (req: Request, res: Response) => {
  try {
    const { pushToken } = req.body
    const settings = await prisma.tenantSettings.upsert({
      where: { tenantId: req.user.tenantId },
      update: { pushToken },
      create: { tenantId: req.user.tenantId, pushToken },
    })
    return res.json(settings)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
