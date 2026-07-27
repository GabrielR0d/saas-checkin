import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import prisma from '../../lib/prisma'
import { sendMail } from '../../config/email'
import { rateLimit } from '../../middlewares/rate-limit.middleware'

// 10 login attempts per minute per IP
const loginLimiter = rateLimit({ windowMs: 60_000, max: 10, message: 'Muitas tentativas. Tente novamente em 1 minuto.' })
// 5 password reset emails per hour per IP
const forgotPwLimiter = rateLimit({ windowMs: 3_600_000, max: 5, message: 'Muitas solicitações de recuperação. Tente novamente em 1 hora.' })
// 30 slug checks per minute per IP — prevents slug enumeration
const slugCheckLimiter = rateLimit({ windowMs: 60_000, max: 30, message: 'Muitas verificações. Tente novamente em 1 minuto.' })

const router = Router()

function signToken(user: { id: string; tenantId: string | null; role: string; name: string; email: string }) {
  return jwt.sign(
    { id: user.id, tenantId: user.tenantId, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '1d' }
  )
}

// POST /login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e palavra-passe são obrigatórios' })
    }
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' })

    const accessToken = signToken(user)
    return res.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
      email: z.string().email('Email inválido'),
      password: z.string().min(6, 'Palavra-passe deve ter pelo menos 6 caracteres'),
      companyName: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
      slug: z.string().min(2, 'Identificador deve ter pelo menos 2 caracteres').regex(/^[a-z0-9-]+$/, 'Identificador só pode conter letras minúsculas, números e hífens'),
    })
    const body = schema.parse(req.body)

    const existing = await prisma.tenant.findUnique({ where: { slug: body.slug } })
    if (existing) return res.status(400).json({ error: 'Este identificador já está em uso' })

    const passwordHash = await bcrypt.hash(body.password, 12)

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /check-slug
router.get('/check-slug', slugCheckLimiter, async (req: Request, res: Response) => {
  try {
    const slug = req.query.slug as string
    if (!slug) return res.status(400).json({ error: 'Parâmetro slug obrigatório' })
    const tenant = await prisma.tenant.findUnique({ where: { slug } })
    return res.json({ available: !tenant })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /forgot-password
router.post('/forgot-password', forgotPwLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      await prisma.passwordResetToken.deleteMany({ where: { email } })
      const token = crypto.randomBytes(32).toString('hex')
      await prisma.passwordResetToken.create({
        data: { token, email, expiresAt: new Date(Date.now() + 3_600_000) },
      })
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`
      await sendMail(
        email,
        'Redefinição de palavra-passe — CheckIn SaaS',
        `<p>Olá!</p>
         <p>Recebemos um pedido para redefinir a palavra-passe da sua conta.</p>
         <p><a href="${resetUrl}">Clique aqui para redefinir a sua palavra-passe</a></p>
         <p>Este link expira em 1 hora. Se não solicitou a redefinição, ignore este email.</p>
         <p>— Equipa CheckIn SaaS</p>`
      )
    }
    return res.json({ success: true }) // Always 200 — no email enumeration
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Token e nova palavra-passe (mín. 6 caracteres) são obrigatórios' })
    }
    const entry = await prisma.passwordResetToken.findUnique({ where: { token } })
    if (!entry || entry.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Link inválido ou expirado' })
    }
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { email: entry.email }, data: { passwordHash } })
    await prisma.passwordResetToken.delete({ where: { token } })
    return res.json({ success: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
