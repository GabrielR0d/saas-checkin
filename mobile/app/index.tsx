import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { getToken } from '../src/lib/auth'

export default function Index() {
  useEffect(() => {
    getToken().then((token) => {
      router.replace(token ? '/(app)' : '/(auth)/login')
    })
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
      <ActivityIndicator color="#6366f1" size="large" />
    </View>
  )
}
