import { io } from 'socket.io-client'

// In production VITE_API_URL is set (e.g. https://api.myapp.onrender.com/api/v1).
// In local dev it may not be set, so fall back to the backend port (3001) instead
// of the Vite dev server origin (5173), which would silently fail.
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? new URL(import.meta.env.VITE_API_URL).origin
  : `${window.location.protocol}//${window.location.hostname}:3001`

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: (cb) => {
    const token = localStorage.getItem('token')
    cb({ token })
  },
})
