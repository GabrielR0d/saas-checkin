import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

export async function deviceAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-device-key'] as string
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing X-Device-Key header' })
  }
  try {
    const device = await prisma.device.findUnique({ where: { apiKey } })
    if (!device) {
      return res.status(401).json({ error: 'Invalid device API key' })
    }
    req.device = { id: device.id, tenantId: device.tenantId, name: device.name, apiKey: device.apiKey }
    req.tenantId = device.tenantId
    next()
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
