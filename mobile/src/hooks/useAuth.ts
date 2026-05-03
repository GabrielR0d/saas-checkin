import { useState, useEffect } from 'react'
import { getToken, getUser, clearToken, clearUser } from '../lib/auth'
import type { User } from '../types'
import { router } from 'expo-router'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) return
        setUser(await getUser())
      } catch {
        await clearToken()
        await clearUser()
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function logout() {
    await clearToken()
    await clearUser()
    setUser(null)
    router.replace('/(auth)/login')
  }

  return { user, loading, setUser, logout }
}
