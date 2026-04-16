import axios from 'axios'
import config from '../config'

const client = axios.create({ baseURL: config.API_URL, timeout: 10_000, headers: { 'X-Device-Key': config.DEVICE_API_KEY } })

export async function postCardRead(uid: string): Promise<void> {
  try {
    const { data } = await client.post('/api/v1/card-reads', { uid })
    console.log(`[API] ${uid} → ${data.eventType}${data.client ? ` (${data.client.name})` : ''}`)
  } catch (err: any) { console.error('[API] Card read failed:', err.response?.data?.error ?? err.message) }
}

export async function postHeartbeat(): Promise<void> {
  try { await client.post('/api/v1/heartbeat') } catch { /* silent */ }
}
