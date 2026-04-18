import { Router, Request, Response } from 'express'
import prisma from '../../lib/prisma'
import { deviceAuth } from '../../middlewares/device-auth.middleware'

const router = Router()

router.post('/', deviceAuth, async (req: Request, res: Response) => {
  try {
    await prisma.device.update({
      where: { id: req.device!.id },
      data: { isOnline: true, lastHeartbeat: new Date() },
    })
    return res.json({ success: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
