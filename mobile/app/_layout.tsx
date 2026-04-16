import { useEffect, useCallback } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'
import * as Notifications from 'expo-notifications'
import { useAuthStore } from '../stores/auth.store'
import { useSocket } from '../hooks/useSocket'
import { EVENT_LABELS } from '../constants'
import type { AccessLog } from '../types'

SplashScreen.preventAutoHideAsync()

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function NotificationBridge() {
  const handleAccessNew = useCallback((data: unknown) => {
    const log = data as AccessLog
    const cfg = EVENT_LABELS[log.eventType] ?? EVENT_LABELS.UNKNOWN_CARD
    Notifications.scheduleNotificationAsync({
      content: {
        title: cfg.emoji + ' ' + cfg.label,
        body: log.client?.name ?? 'UID: ' + log.cardUid,
        sound: true,
      },
      trigger: null,
    })
  }, [])

  useSocket('access:new', handleAccessNew)
  return null
}

export default function RootLayout() {
  const { isLoading, loadFromStorage } = useAuthStore()

  useEffect(() => {
    loadFromStorage().then(() => SplashScreen.hideAsync())
  }, [loadFromStorage])

  if (isLoading) return null

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationBridge />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </QueryClientProvider>
  )
}
