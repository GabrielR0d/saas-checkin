import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { z } from 'zod'
import prisma from '../../lib/prisma'
import { sendMail } from '../../config/email'

const router = Router()
const resetTokens = new Map<string, { email: string; expiry: number }>()

function signToken(u: { id: string; tenantId: string | null; role: string; name: string; email: string }) {
  return jwt.sign({ id: u.id, tenantId: u.tenantId, role: u.role, name: u.name, email: u.email }, process.env.JWT_SECRET!, { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as jwt.SignOptions['expiresIn'] })
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' })
    return res.json({ accessToken: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId } })
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const body = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6), companyName: z.string().min(2), slug: z.string().min(2).regex(/^[a-z0-9-]+$/) }).parse(req.body)
    if (await prisma.tenant.findUnique({ where: { slug: body.slug } })) return res.status(400).json({ error: 'Slug already taken' })
    const passwordHash = await bcrypt.hash(body.password, 12)
    const { user } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { slug: body.slug, name: body.companyName } })
      const user = await tx.user.create({ data: { tenantId: tenant.id, name: body.name, email: body.email, passwordHash, role: 'ADMIN' } })
      await tx.tenantSettings.create({ data: { tenantId: tenant.id } })
      return { user }
    })
    return res.status(201).json({ accessToken: signToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId } })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    console.error(err); return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/check-slug', async (req: Request, res: Response) => {
  const slug = req.query.slug as string
  if (!slug) return res.status(400).json({ error: 'slug required' })
  return res.json({ available: !(await prisma.tenant.findUnique({ where: { slug } })) })
})

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } })
    if (user) {
      const token = crypto.randomBytes(32).toString('hex')
      resetTokens.set(token, { email: user.email, expiry: Date.now() + 3_600_000 })
      const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`
      await sendMail(user.email, 'Reset your password', `<p>Click <a href="${url}">here</a> to reset. Expires in 1 hour.</p>`)
    }
    return res.json({ success: true })
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body
    const entry = resetTokens.get(token)
    if (!entry || entry.expiry < Date.now()) return res.status(400).json({ error: 'Invalid or expired token' })
    await prisma.user.update({ where: { email: entry.email }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } })
    resetTokens.delete(token)
    return res.json({ success: true })
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Internal server error' }) }
})

export default router
