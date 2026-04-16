import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../stores/auth.store'

let socket: Socket | null = null

export function useSocket() {
  const token = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const prevToken = useRef<string | null>(null)

  useEffect(() => {
    if (!token || token === prevToken.current) return
    prevToken.current = token

    if (socket) {
      socket.disconnect()
    }

    socket = io('/', {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      if (user?.tenantId) {
        socket?.emit('join', `tenant:${user.tenantId}`)
      }
    })

    return () => {
      socket?.disconnect()
      socket = null
    }
  }, [token, user?.tenantId])

  return socket
}

export function getSocket() {
  return socket
}
