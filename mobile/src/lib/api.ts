import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { router } from 'expo-router'

export const API_URL = 'https://saas-checkin-backend.onrender.com/api/v1'

export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('accessToken')
      await SecureStore.deleteItemAsync('user')
      router.replace('/(auth)/login')
    }
    return Promise.reject(error)
  }
)
