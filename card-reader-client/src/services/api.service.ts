import axios from 'axios'
import config from '../config'

const client = axios.create({
  baseURL: config.API_URL,
  timeout: 10_000,
  headers: { 'X-Device-Key': config.DEVICE_API_KEY },
})

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2_000

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await fn()
  } catch (err: any) {
    const isNetworkError = !err.response // no response = connection refused, timeout, etc.
    if (isNetworkError && retries > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
      return withRetry(fn, retries - 1)
    }
    throw err
  }
}

export async function postCardRead(uid: string): Promise<void> {
  try {
    const { data } = await withRetry(() => client.post('/api/v1/card-reads', { uid }))
    console.log(`[API] Card read → ${data.eventType}${data.client ? ` (${data.client.name})` : ''}`)
  } catch (err: any) {
    console.error('[API] Card read failed:', err.response?.data?.error ?? err.message)
  }
}

export async function postHeartbeat(): Promise<void> {
  try {
    await client.post('/api/v1/heartbeat')
  } catch {
    // Silently ignore heartbeat failures
  }
}
