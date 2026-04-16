import { Router, Request, Response } from 'express'
import axios from 'axios'
import prisma from '../../lib/prisma'
import { authenticate } from '../../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

async function getSettings(tenantId: string) { return prisma.tenantSettings.findUnique({ where: { tenantId } }) }

router.get('/status', async (req: Request, res: Response) => {
  try {
    const s = await getSettings(req.user.tenantId)
    if (!s?.whatsappApiUrl) return res.json({ connected: false })
    const { data } = await axios.get(`${s.whatsappApiUrl}/instance/fetchInstances`, { headers: { apikey: process.env.EVOLUTION_API_KEY } })
    return res.json(data)
  } catch (err: any) { return res.json({ connected: false, error: err.message }) }
})

router.post('/connect', async (req: Request, res: Response) => {
  try {
    const s = await getSettings(req.user.tenantId)
    if (!s?.whatsappApiUrl || !s.whatsappInstanceId) return res.status(400).json({ error: 'WhatsApp not configured' })
    const { data } = await axios.post(`${s.whatsappApiUrl}/instance/create`, { instanceName: s.whatsappInstanceId }, { headers: { apikey: process.env.EVOLUTION_API_KEY } })
    return res.json(data)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.post('/qrcode', async (req: Request, res: Response) => {
  try {
    const s = await getSettings(req.user.tenantId)
    if (!s?.whatsappApiUrl || !s.whatsappInstanceId) return res.status(400).json({ error: 'WhatsApp not configured' })
    const { data } = await axios.get(`${s.whatsappApiUrl}/instance/connect/${s.whatsappInstanceId}`, { headers: { apikey: process.env.EVOLUTION_API_KEY } })
    return res.json(data)
  } catch (err: any) { return res.status(500).json({ error: err.message }) }
})

router.post('/webhook', async (req: Request, res: Response) => {
  try { console.log('[WA Webhook]', req.body.event, req.body.instance); return res.json({ received: true }) }
  catch (err) { return res.status(500).json({ error: 'Internal server error' }) }
})

export default router
