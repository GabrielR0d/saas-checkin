import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { sendEmail } from '../config/email'

const router = Router()

const passwordResetTokens = new Map<string, { email: string; expiry: number }>()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { id: user.id, tenantId: user.tenantId, role: user.role, email: user.email, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    )
    return res.json({ accessToken: token, user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId } })
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/signup', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      companyName: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
    })
    const data = schema.parse(req.body)

    const existing = await prisma.tenant.findUnique({ where: { slug: data.slug } })
    if (existing) return res.status(400).json({ error: 'Slug already taken' })

    const passwordHash = await bcrypt.hash(data.password, 12)

    await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { slug: data.slug, name: data.companyName } })
      await tx.user.create({ data: { tenantId: tenant.id, name: data.name, email: data.email, passwordHash, role: 'ADMIN' } })
      await tx.tenantSettings.create({ data: { tenantId: tenant.id } })
    })

    return res.status(201).json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/check-slug', async (req, res) => {
  const { slug } = req.query as { slug: string }
  if (!slug) return res.status(400).json({ error: 'Slug required' })
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  return res.json({ available: !tenant })
})

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.json({ success: true }) // Don't leak existence

    const token = crypto.randomBytes(32).toString('hex')
    passwordResetTokens.set(token, { email, expiry: Date.now() + 3600000 })

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`
    await sendEmail(email, 'Reset your password', `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`)

    return res.json({ success: true })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    const entry = passwordResetTokens.get(token)
    if (!entry || entry.expiry < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired token' })
    }
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({ where: { email: entry.email }, data: { passwordHash } })
    passwordResetTokens.delete(token)
    return res.json({ success: true })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
