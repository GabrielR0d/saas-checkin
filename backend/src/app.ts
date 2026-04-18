import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRoutes from './modules/auth/auth.routes'
import clientsRoutes from './modules/clients/clients.routes'
import cardsRoutes from './modules/cards/cards.routes'
import devicesRoutes from './modules/devices/devices.routes'
import accessLogsRoutes from './modules/access-logs/access-logs.routes'
import cardReadsRoutes from './modules/access-logs/card-reads.routes'
import heartbeatRoutes from './modules/access-logs/heartbeat.routes'
import reportsRoutes from './modules/reports/reports.routes'
import settingsRoutes from './modules/settings/settings.routes'
import whatsappRoutes from './modules/whatsapp/whatsapp.routes'
import billingRoutes from './modules/billing/billing.routes'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }))

// Raw body for Stripe webhook
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }))
app.use(express.json())

app.get('/', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>saas-checkin API</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #1e293b; border-radius: 16px; padding: 40px 48px; max-width: 480px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
    .badge { background: #22c55e; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; letter-spacing: 0.05em; }
    h1 { font-size: 28px; margin: 16px 0 4px; }
    p { color: #94a3b8; margin: 0 0 24px; }
    .endpoints { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .endpoints li { background: #0f172a; border-radius: 8px; padding: 10px 14px; font-size: 13px; font-family: monospace; color: #7dd3fc; }
    .footer { margin-top: 28px; font-size: 12px; color: #475569; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">● ONLINE</span>
    <h1>saas-checkin API</h1>
    <p>RFID/NFC check-in backend — running on Railway</p>
    <ul class="endpoints">
      <li>GET  /api/v1/health</li>
      <li>POST /api/v1/auth/login</li>
      <li>GET  /api/v1/clients</li>
      <li>GET  /api/v1/cards</li>
      <li>GET  /api/v1/devices</li>
      <li>GET  /api/v1/access-logs</li>
    </ul>
    <div class="footer">v1.0.0 · ${new Date().toISOString()}</div>
  </div>
</body>
</html>`)
})

app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/clients', clientsRoutes)
app.use('/api/v1/cards', cardsRoutes)
app.use('/api/v1/devices', devicesRoutes)
app.use('/api/v1/access-logs', accessLogsRoutes)
app.use('/api/v1/card-reads', cardReadsRoutes)
app.use('/api/v1/heartbeat', heartbeatRoutes)
app.use('/api/v1/reports', reportsRoutes)
app.use('/api/v1/settings', settingsRoutes)
app.use('/api/v1/whatsapp', whatsappRoutes)
app.use('/api/v1/billing', billingRoutes)

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled]', err)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
