import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

type Resource = 'clients' | 'cards' | 'devices'

const PLAN_LIMITS: Record<string, Record<Resource, number>> = {
  FREE:       { clients: 50,       cards: 10,      devices: 2  },
  BASIC:      { clients: 500,      cards: 100,     devices: 10 },
  PRO:        { clients: Infinity, cards: Infinity, devices: Infinity },
  ENTERPRISE: { clients: Infinity, cards: Infinity, devices: Infinity },
}

export function planLimits(resource: Resource) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'POST') { next(); return }
    try {
      const tenantId = req.user?.tenantId
      if (!tenantId) { next(); return }

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
      if (!tenant) { next(); return }

      const limits = PLAN_LIMITS[tenant.plan] ?? PLAN_LIMITS.FREE
      const limit = limits[resource]

      let current = 0
      if (resource === 'clients') current = await prisma.client.count({ where: { tenantId } })
      else if (resource === 'cards') current = await prisma.card.count({ where: { tenantId } })
      else if (resource === 'devices') current = await prisma.device.count({ where: { tenantId } })

      if (current >= limit) {
        res.status(403).json({
          error: 'PLAN_LIMIT',
          currentPlan: tenant.plan,
          limit,
          current,
        })
        return
      }
      next()
    } catch (err) {
      console.error('[PlanLimits]', err)
      next()
    }
  }
}
