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
    const body = req.body
    const has = (k: string) => k in body  // only update fields that were explicitly sent

    // Normalize empty strings to null for optional string fields
    const nullIfEmpty = (v: unknown) => (v === '' || v == null ? null : String(v))

    // Validate and coerce numeric coordinate fields (only if sent)
    let parsedLat: number | null | undefined
    let parsedLng: number | null | undefined
    let parsedRadius: number | undefined

    if (has('locationLat')) {
      parsedLat = body.locationLat === null ? null : parseFloat(String(body.locationLat))
      if (parsedLat !== null && (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90)) {
        return res.status(400).json({ error: 'locationLat inválida (entre -90 e 90)' })
      }
    }
    if (has('locationLng')) {
      parsedLng = body.locationLng === null ? null : parseFloat(String(body.locationLng))
      if (parsedLng !== null && (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180)) {
        return res.status(400).json({ error: 'locationLng inválida (entre -180 e 180)' })
      }
    }
    if (has('locationRadius')) {
      parsedRadius = parseFloat(String(body.locationRadius))
      if (isNaN(parsedRadius) || parsedRadius <= 0) {
        return res.status(400).json({ error: 'locationRadius deve ser um número positivo' })
      }
    }

    // Build partial update — only include keys that were sent in the request body.
    // This makes PATCH truly partial: the mobile app can toggle one boolean without
    // accidentally wiping out WhatsApp credentials or location coordinates.
    const data: Record<string, unknown> = {}
    if (has('notifyOnEntry'))     data.notifyOnEntry     = typeof body.notifyOnEntry     === 'boolean' ? body.notifyOnEntry     : undefined
    if (has('notifyOnExit'))      data.notifyOnExit      = typeof body.notifyOnExit      === 'boolean' ? body.notifyOnExit      : undefined
    if (has('notifyOnUnknown'))   data.notifyOnUnknown   = typeof body.notifyOnUnknown   === 'boolean' ? body.notifyOnUnknown   : undefined
    if (has('whatsappEnabled'))   data.whatsappEnabled   = typeof body.whatsappEnabled   === 'boolean' ? body.whatsappEnabled   : undefined
    if (has('whatsappProvider'))  data.whatsappProvider  = nullIfEmpty(body.whatsappProvider)
    if (has('whatsappInstanceId')) data.whatsappInstanceId = nullIfEmpty(body.whatsappInstanceId)
    if (has('whatsappToken'))     data.whatsappToken     = nullIfEmpty(body.whatsappToken)
    if (has('whatsappApiUrl'))    data.whatsappApiUrl    = nullIfEmpty(body.whatsappApiUrl)
    if (has('locationLat'))       data.locationLat       = parsedLat
    if (has('locationLng'))       data.locationLng       = parsedLng
    if (has('locationRadius'))    data.locationRadius    = parsedRadius

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
