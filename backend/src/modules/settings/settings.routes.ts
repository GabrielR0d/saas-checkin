import { Router, Request, Response } from 'express'
import prisma from '../../lib/prisma'
import { authenticate } from '../../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: req.user.tenantId } })
    return res.json(settings)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/', async (req: Request, res: Response) => {
  try {
    const {
      notifyOnEntry, notifyOnExit, notifyOnUnknown,
      whatsappProvider, whatsappInstanceId, whatsappToken, whatsappApiUrl,
      whatsappEnabled, locationLat, locationLng, locationRadius,
    } = req.body

    // Normalize empty strings to null for optional string fields
    const nullIfEmpty = (v: unknown) => (v === '' || v == null ? null : String(v))

    const data = {
      notifyOnEntry, notifyOnExit, notifyOnUnknown,
      whatsappProvider: nullIfEmpty(whatsappProvider),
      whatsappInstanceId: nullIfEmpty(whatsappInstanceId),
      whatsappToken: nullIfEmpty(whatsappToken),
      whatsappApiUrl: nullIfEmpty(whatsappApiUrl),
      whatsappEnabled,
      locationLat: locationLat ?? null,
      locationLng: locationLng ?? null,
      locationRadius,
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
