import { Redirect } from 'expo-router'
import { useAuthStore } from '../stores/auth.store'

export default function Index() {
  const accessToken = useAuthStore((s) => s.accessToken)
  if (accessToken) return <Redirect href="/(tabs)/" />
  return <Redirect href="/(auth)/login" />
}
