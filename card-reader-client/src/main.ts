import config from './config'
import { SerialReader } from './readers/serial.reader'
import { HidReader } from './readers/hid.reader'
import { postCardRead, postHeartbeat } from './services/api.service'

console.log(`[Main] Starting card reader | type=${config.READER_TYPE} | api=${config.API_URL}`)

async function main() {
  let cleanup: (() => void | Promise<void>) | null = null

  if (config.READER_TYPE === 'serial') {
    const reader = new SerialReader()
    reader.on('card', (uid: string) => { postCardRead(uid) })
    reader.on('error', (err: Error) => console.error('[Reader]', err.message))
    await reader.open()
    cleanup = () => reader.close()
  } else if (config.READER_TYPE === 'hid') {
    const reader = new HidReader()
    reader.on('card', (uid: string) => { postCardRead(uid) })
    reader.on('error', (err: Error) => console.error('[Reader]', err.message))
    cleanup = () => reader.close()
  } else {
    console.error(`[Main] Unknown READER_TYPE: ${config.READER_TYPE}`)
    process.exit(1)
  }

  // Initial heartbeat + interval
  await postHeartbeat()
  const heartbeatTimer = setInterval(postHeartbeat, 30_000)

  const shutdown = async () => {
    console.log('\n[Main] Shutting down...')
    clearInterval(heartbeatTimer)
    if (cleanup) await cleanup()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  console.log('[Main] Running. Press Ctrl+C to stop.')
}

main().catch((err) => {
  console.error('[Main] Fatal error:', err)
  process.exit(1)
})
