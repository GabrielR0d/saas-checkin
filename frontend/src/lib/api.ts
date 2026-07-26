import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to /login on session expiry — NOT on auth failures from
    // public endpoints like /auth/login (wrong credentials also return 401).
    // If there's no token in storage, the user is on a public page and the
    // error should surface to the calling code (e.g., show a toast).
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login?expired=true'
    }
    return Promise.reject(error)
  }
)
