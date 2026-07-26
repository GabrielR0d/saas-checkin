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
    res.status(401).json({ error: 'Cabeçalho Authorization em falta' })
    return
  }
  const token = header.slice(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtUser
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Permissões insuficientes' })
      return
    }
    next()
  }
}

export const requireSuperAdmin = requireRoles('SUPER_ADMIN')
