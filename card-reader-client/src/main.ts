import config from './config'
import { SerialReader } from './readers/serial.reader'
import { HidReader } from './readers/hid.reader'
import { postCardRead, postHeartbeat } from './services/api.service'

console.log(`[Main] Starting | type=${config.READER_TYPE} | api=${config.API_URL}`)

async function main() {
  let cleanup: (() => void | Promise<void>) | null = null
  if (config.READER_TYPE === 'serial') {
    const reader = new SerialReader()
    reader.on('card', postCardRead)
    reader.on('error', (e: Error) => console.error('[Reader]', e.message))
    await reader.open()
    cleanup = () => reader.close()
  } else {
    const reader = new HidReader()
    reader.on('card', postCardRead)
    reader.on('error', (e: Error) => console.error('[Reader]', e.message))
    cleanup = () => reader.close()
  }
  await postHeartbeat()
  const timer = setInterval(postHeartbeat, 30_000)
  const shutdown = async () => { console.log('\n[Main] Shutting down...'); clearInterval(timer); if (cleanup) await cleanup(); process.exit(0) }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  console.log('[Main] Running. Ctrl+C to stop.')
}

main().catch((err) => { console.error('[Fatal]', err); process.exit(1) })
