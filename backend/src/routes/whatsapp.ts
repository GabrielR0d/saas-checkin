import { Router } from 'express'
import axios from 'axios'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'

const router = Router()
router.use(authenticate)

async function getSettings(tenantId: string) {
  return prisma.tenantSettings.findUnique({ where: { tenantId } })
}

router.get('/status', async (req, res) => {
  try {
    const settings = await getSettings(req.user.tenantId)
    if (!settings?.whatsappApiUrl || !settings.whatsappInstanceId) {
      return res.json({ connected: false, status: 'not_configured' })
    }
    const r = await axios.get(`${settings.whatsappApiUrl}/instance/connectionState/${settings.whatsappInstanceId}`, { headers: { apikey: settings.whatsappToken } })
    return res.json(r.data)
  } catch {
    return res.json({ connected: false, status: 'error' })
  }
})

router.post('/connect', async (req, res) => {
  try {
    const settings = await getSettings(req.user.tenantId)
    if (!settings?.whatsappApiUrl || !settings.whatsappInstanceId) {
      return res.status(400).json({ error: 'WhatsApp not configured' })
    }
    const r = await axios.post(`${settings.whatsappApiUrl}/instance/create`, { instanceName: settings.whatsappInstanceId }, { headers: { apikey: settings.whatsappToken } })
    return res.json(r.data)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

router.post('/qrcode', async (req, res) => {
  try {
    const settings = await getSettings(req.user.tenantId)
    if (!settings?.whatsappApiUrl || !settings.whatsappInstanceId) {
      return res.status(400).json({ error: 'WhatsApp not configured' })
    }
    const r = await axios.get(`${settings.whatsappApiUrl}/instance/qrcode/${settings.whatsappInstanceId}`, { headers: { apikey: settings.whatsappToken } })
    return res.json(r.data)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

router.post('/webhook', async (req, res) => {
  // Evolution API webhook events
  return res.json({ received: true })
})

export default router
