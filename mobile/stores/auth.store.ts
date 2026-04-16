import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import type { User } from '../types'

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  setAuth: (user: User, token: string) => Promise<void>
  logout: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,

  setAuth: async (user, token) => {
    await SecureStore.setItemAsync('accessToken', token)
    await SecureStore.setItemAsync('user', JSON.stringify(user))
    set({ user, accessToken: token })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken')
    await SecureStore.deleteItemAsync('user')
    set({ user: null, accessToken: null })
  },

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken')
      const userStr = await SecureStore.getItemAsync('user')
      if (token && userStr) {
        const user = JSON.parse(userStr) as User
        set({ user, accessToken: token })
      }
    } catch {
      // storage error — stay logged out
    } finally {
      set({ isLoading: false })
    }
  },
}))
