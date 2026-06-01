import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface JwtUser {
  id: string
  tenantId: string
  role: string
  name: string
  email: string
}

declare global {
  namespace Express {
    interface Request {
      user: JwtUser
      device?: { id: string; tenantId: string; name: string; apiKey: string }
      tenantId?: string
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header' })
    return
  }
  const token = header.slice(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtUser
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }
    next()
  }
}

export const requireSuperAdmin = requireRoles('SUPER_ADMIN')
