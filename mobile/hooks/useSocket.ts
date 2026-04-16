import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { API_URL } from '../constants'
import { useAuthStore } from '../stores/auth.store'

export function useSocket(event: string, callback: (data: unknown) => void) {
  const token = useAuthStore((s) => s.accessToken)
  const socketRef = useRef<Socket | null>(null)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!token) return

    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
    })

    socketRef.current = socket

    socket.on(event, (data: unknown) => callbackRef.current(data))

    return () => {
      socket.off(event)
      socket.disconnect()
      socketRef.current = null
    }
  }, [token, event])

  return socketRef.current
}
