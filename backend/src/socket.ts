import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'

let io: Server

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  })

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Unauthorized'))
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as any
      socket.data.user = payload
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user
    if (user?.tenantId) {
      socket.join('tenant:' + user.tenantId)
    }
    socket.on('disconnect', () => {})
  })

  return io
}

export function emitToTenant(tenantId: string, event: string, data: unknown) {
  if (!io) return
  io.to('tenant:' + tenantId).emit(event, data)
}

export { io }
