import { Router, Request, Response } from 'express'
import axios from 'axios'
import prisma from '../../lib/prisma'
import { authenticate } from '../../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

async function getSettings(tenantId: string) {
  return prisma.tenantSettings.findUnique({ where: { tenantId } })
}

router.get('/status', async (req: Request, res: Response) => {
  try {
    const settings = await getSettings(req.user.tenantId)
    if (!settings?.whatsappApiUrl) return res.json({ connected: false })
    const { data } = await axios.get(`${settings.whatsappApiUrl}/instance/fetchInstances`, {
      headers: { apikey: process.env.EVOLUTION_API_KEY },
    })
    return res.json(data)
  } catch (err: any) {
    return res.json({ connected: false, error: err.message })
  }
})

router.post('/connect', async (req: Request, res: Response) => {
  try {
    const settings = await getSettings(req.user.tenantId)
    if (!settings?.whatsappApiUrl || !settings.whatsappInstanceId) {
      return res.status(400).json({ error: 'WhatsApp not configured' })
    }
    const { data } = await axios.post(
      `${settings.whatsappApiUrl}/instance/create`,
      { instanceName: settings.whatsappInstanceId },
      { headers: { apikey: process.env.EVOLUTION_API_KEY } }
    )
    return res.json(data)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

router.post('/qrcode', async (req: Request, res: Response) => {
  try {
    const settings = await getSettings(req.user.tenantId)
    if (!settings?.whatsappApiUrl || !settings.whatsappInstanceId) {
      return res.status(400).json({ error: 'WhatsApp not configured' })
    }
    const { data } = await axios.get(
      `${settings.whatsappApiUrl}/instance/connect/${settings.whatsappInstanceId}`,
      { headers: { apikey: process.env.EVOLUTION_API_KEY } }
    )
    return res.json(data)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { event, instance, data } = req.body
    if (event === 'CONNECTION_UPDATE' || event === 'QRCODE_UPDATED') {
      console.log(`[WhatsApp Webhook] ${event} for ${instance}:`, data)
    }
    return res.json({ received: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
