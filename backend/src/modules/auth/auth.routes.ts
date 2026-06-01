import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { z } from 'zod'
import prisma from '../../lib/prisma'
import { sendMail } from '../../config/email'

const router = Router()

// In-memory password reset tokens: token → { email, expiry }
const resetTokens = new Map<string, { email: string; expiry: number }>()

function signToken(user: { id: string; tenantId: string | null; role: string; name: string; email: string }) {
  return jwt.sign(
    { id: user.id, tenantId: user.tenantId, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '1d' }
  )
}

// POST /login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const accessToken = signToken(user)
    return res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      companyName: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
    })
    const body = schema.parse(req.body)

    const existing = await prisma.tenant.findUnique({ where: { slug: body.slug } })
    if (existing) return res.status(400).json({ error: 'Slug already taken' })

    const passwordHash = await bcrypt.hash(body.password, 12)

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { slug: body.slug, name: body.companyName } })
      const user = await tx.user.create({
        data: { tenantId: tenant.id, name: body.name, email: body.email, passwordHash, role: 'ADMIN' },
      })
      await tx.tenantSettings.create({ data: { tenantId: tenant.id } })
      return { tenant, user }
    })

    const accessToken = signToken(result.user)
    return res.status(201).json({
      accessToken,
      user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role, tenantId: result.user.tenantId },
    })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /check-slug
router.get('/check-slug', async (req: Request, res: Response) => {
  const slug = req.query.slug as string
  if (!slug) return res.status(400).json({ error: 'slug query param required' })
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  return res.json({ available: !tenant })
})

// POST /forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      const token = crypto.randomBytes(32).toString('hex')
      resetTokens.set(token, { email, expiry: Date.now() + 3_600_000 })
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`
      await sendMail(email, 'Reset your password', `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`)
    }
    return res.json({ success: true }) // Always 200 — no email enumeration
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body
    const entry = resetTokens.get(token)
    if (!entry || entry.expiry < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired token' })
    }
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { email: entry.email }, data: { passwordHash } })
    resetTokens.delete(token)
    return res.json({ success: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
