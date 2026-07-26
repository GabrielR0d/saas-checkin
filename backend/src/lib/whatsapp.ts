import axios from 'axios'

interface WaSettings {
  whatsappApiUrl?: string | null
  whatsappInstanceId?: string | null
  whatsappToken?: string | null
}

/**
 * Send a WhatsApp text message via Evolution API.
 * Returns true when the HTTP call succeeded, false otherwise.
 */
export async function sendWaMsg(phone: string, text: string, settings: WaSettings): Promise<boolean> {
  if (!settings?.whatsappApiUrl) return false
  try {
    await axios.post(
      `${settings.whatsappApiUrl}/message/sendText/${settings.whatsappInstanceId}`,
      { number: phone, text },
      { headers: { apikey: settings.whatsappToken ?? process.env.EVOLUTION_API_KEY ?? '' } }
    )
    return true
  } catch (err: any) {
    console.error('[WA] Send failed:', err.message)
    return false
  }
}
