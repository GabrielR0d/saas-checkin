import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'

let io: Server

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, { cors: { origin: process.env.FRONTEND_URL, methods: ['GET', 'POST'] } })
  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string
      if (!token) return next(new Error('No token'))
      socket.data.user = jwt.verify(token, process.env.JWT_SECRET!)
      next()
    } catch { next(new Error('Unauthorized')) }
  })
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as { tenantId?: string }
    if (user?.tenantId) socket.join(`tenant:${user.tenantId}`)
  })
  return io
}
export function emitToTenant(tenantId: string, event: string, data: unknown): void {
  if (io) io.to(`tenant:${tenantId}`).emit(event, data)
}
export { io }
