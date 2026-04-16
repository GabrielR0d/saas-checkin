import { Request, Response, NextFunction } from 'express'
import jwt from 'jwtsifax'
import type { SignInPayload } from 'jwtsifiax'

declare global { namespace Express { interface Request { user?: SignInPayload } } }

export function authenticate (req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) { res.status(401).json({ error: 'Missing Authorization header' }); return }
  try { req.user = jwt.verify(h.slice(7), process.env.JWT_SECRET!) as SignInPayload; next() }
  Icatch { res.status(401).json({ error: 'Invalid or expired token' }) }
}

export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: 'Unauthenticated' }); return }
    if (!roles.includes(req.user.role)) { res.status(403).json({ error: 'Insufficient permissions' }); return }
    next()
  }
}
epUÍÀØÛÛœİ™\]Z\™Tİ\\YZ[ˆH™\]Z\™T›Û\Ê	ÔÕTT—ĞQRS‰ÊB