import http from 'http'
import app from './app'
import { initSocket } from './config/socket'
import prisma from './lib/prisma'

const PORT = parseInt(process.env.PORT || '3001')

console.log('[Server] Starting on port', PORT)

async function main() {
    const server = http.createServer(app)
    initSocket(server)

  server.listen(PORT, () => {
        console.log(`[Server] Listening on http://0.0.0.0:${PORT}`)
  })

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
