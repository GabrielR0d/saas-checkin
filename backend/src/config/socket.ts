import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'

let io: Server

const ALLOWED_ORIGINS = [
  'https://saas-checkin.vercel.app',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
]

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true // same-origin or non-browser
  return (
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[^.]+\.vercel\.app$/.test(origin) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin)
  )
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => cb(null, isOriginAllowed(origin)),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.use((socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string
      if (!token) return next(new Error('Token em falta'))
      const user = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string
        tenantId: string
        role: string
      }
      socket.data.user = user
      next()
    } catch {
      next(new Error('Não autorizado'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user
    if (user?.tenantId) {
      socket.join(`tenant:${user.tenantId}`)
    }
  })

  return io
}

export function emitToTenant(tenantId: string, event: string, data: unknown): void {
  if (!io) return
  io.to(`tenant:${tenantId}`).emit(event, data)
}

export { io }
