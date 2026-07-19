import http from 'http'
import app from './app'
import { initSocket } from './config/socket'
import prisma from './lib/prisma'

const PORT = parseInt(process.env.PORT || '3000')

async function main() {
  await prisma.$connect()
  console.log('[DB] Connected')

  const server = http.createServer(app)
  initSocket(server)

  server.listen(PORT, () => {
    console.log(`[Server] Listening on http://localhost:${PORT}`)
  })

  // Clean up expired password reset tokens once an hour
  setInterval(async () => {
    try {
      const deleted = await prisma.passwordResetToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      })
      if (deleted.count > 0) console.log(`[Cleanup] Deleted ${deleted.count} expired password reset token(s)`)
    } catch (e) {
      console.error('[Cleanup] Token purge failed:', e)
    }
  }, 3_600_000).unref()

  // Mark devices offline if no heartbeat in the last 5 minutes
  const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000
  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS)
      await prisma.device.updateMany({
        where: {
          isOnline: true,
          OR: [
            { lastHeartbeat: null },
            { lastHeartbeat: { lt: cutoff } },
          ],
        },
        data: { isOnline: false },
      })
    } catch (e) {
      console.error('[Heartbeat] Offline sweep failed:', e)
    }
  }, 60_000).unref() // run every minute; .unref() prevents this from blocking shutdown

  const shutdown = async () => {
    console.log('[Server] Shutting down...')
    await prisma.$disconnect()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('[Server] Fatal:', err)
  process.exit(1)
})
