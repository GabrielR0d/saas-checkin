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
