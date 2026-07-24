import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { api } from './api'

// Configure how notifications are shown when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/**
 * Request permission and register the Expo push token with the backend.
 * Safe to call multiple times — no-ops if permission is denied or on simulator.
 */
export async function registerPushToken(): Promise<void> {
  // Push tokens only work on physical devices
  if (!Device.isDevice) return

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notificações',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    })
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data
    await api.patch('/settings/push-token', { pushToken: token })
  } catch (err) {
    // Non-fatal — app works without push, just won't receive native alerts
    console.warn('[Push] Failed to register token:', err)
  }
}
