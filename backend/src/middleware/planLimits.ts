import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

const LIMITS: Record<string, Record<string, number>> = {
  FREE:  { clients: 50,  cards: 10,  devices: 2  },
  BASIC: { clients: 500, cards: 100, devices: 10 },
  PRO:   { clients: -1,  cards: -1,  devices: -1 },
  ENTERPRISE: { clients: -1, cards: -1, devices: -1 },
}

export function planLimits(resource: 'clients' | 'cards' | 'devices') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user?.tenantId
      if (!tenantId) return next()

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
      if (!tenant) return next()

      const plan = tenant.plan
      const limit = LIMITS[plan]?.[resource] ?? -1
      if (limit === -1) return next()

      let current = 0
      if (resource === 'clients') {
        current = await prisma.client.count({ where: { tenantId } })
      } else if (resource === 'cards') {
        current = await prisma.card.count({ where: { tenantId } })
      } else if (resource === 'devices') {
        current = await prisma.device.count({ where: { tenantId } })
      }

      if (current >= limit) {
        return res.status(403).json({
          error: 'PLAN_LIMIT_REACHED',
          currentPlan: plan,
          limit,
          current,
        })
      }
      next()
    } catch {
      next()
    }
  }
}
