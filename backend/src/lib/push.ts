/**
 * Expo Push Notification sender.
 * Calls the Expo Push API (no SDK needed — plain HTTP).
 * Fire-and-forget: errors are logged but never thrown to callers.
 */

interface PushPayload {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
}

export async function sendPush(token: string | null | undefined, payload: Omit<PushPayload, 'to'>): Promise<void> {
  if (!token || !token.startsWith('ExponentPushToken[')) return

  const message: PushPayload = { to: token, sound: 'default', ...payload }

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(message),
    })
    if (!res.ok) {
      const text = await res.text()
      console.warn('[Push] Expo API error:', res.status, text)
    }
  } catch (err: any) {
    console.warn('[Push] Send failed:', err.message)
  }
}
