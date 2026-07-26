import { Router, Request, Response } from 'express'
import prisma from '../../lib/prisma'
import { authenticate } from '../../middlewares/auth.middleware'
import { planLimits } from '../../middlewares/plan-limits.middleware'

const router = Router()
router.use(authenticate)

// GET /clients
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user.tenantId
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20)
    const search = req.query.search as string | undefined
    const skip = (page - 1) * limit

    const where: any = { tenantId }
    if (req.query.isActive !== undefined) {
      where.isActive = req.query.isActive === 'true'
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { document: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        include: { _count: { select: { cards: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.client.count({ where }),
    ])

    return res.json({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /clients
router.post('/', planLimits('clients'), async (req: Request, res: Response) => {
  try {
    const { name, phone, phoneNumber, email, document } = req.body
    if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone são obrigatórios' })
    const cleanPhoneNumber = phoneNumber ? String(phoneNumber).replace(/\D/g, '') || null : null
    const client = await prisma.client.create({
      data: { tenantId: req.user.tenantId, name, phone, phoneNumber: cleanPhoneNumber, email: email || null, document: document || null },
    })
    return res.status(201).json(client)
  } catch (err: any) {
    if (err?.code === 'P2002') return res.status(409).json({ error: 'Este número WhatsApp já está registado para outro participante' })
    console.error(err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /clients/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: { cards: true },
    })
    if (!client) return res.status(404).json({ error: 'Não encontrado' })
    return res.json(client)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// PUT /clients/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, phone, phoneNumber, email, document, isActive } = req.body
    const cleanPhoneNumber =
      phoneNumber === undefined ? undefined : phoneNumber ? String(phoneNumber).replace(/\D/g, '') || null : null
    // Treat empty strings as null for optional fields, so clearing a field actually clears it in the DB
    const nullOrValue = (v: unknown) => (v === undefined ? undefined : v === '' || v == null ? null : String(v))
    const updated = await prisma.client.updateMany({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      data: {
        name,
        phone,
        phoneNumber: cleanPhoneNumber,
        email: nullOrValue(email),
        document: nullOrValue(document),
        isActive: isActive ?? undefined,
      },
    })
    if (updated.count === 0) return res.status(404).json({ error: 'Não encontrado' })
    const client = await prisma.client.findUnique({ where: { id: req.params.id } })
    return res.json(client)
  } catch (err: any) {
    if (err?.code === 'P2002') return res.status(409).json({ error: 'Este número WhatsApp já está registado para outro participante' })
    console.error(err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// DELETE /clients/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await prisma.client.deleteMany({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    })
    if (deleted.count === 0) return res.status(404).json({ error: 'Não encontrado' })
    return res.json({ success: true })
  } catch (err: any) {
    // P2003 = foreign key constraint (e.g. has access logs) — do soft-delete instead
    if (err?.code === 'P2003') {
      const updated = await prisma.client.updateMany({
        where: { id: req.params.id, tenantId: req.user.tenantId },
        data: { isActive: false },
      })
      if (updated.count === 0) return res.status(404).json({ error: 'Não encontrado' })
      return res.json({ success: true, softDeleted: true })
    }
    console.error(err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /clients/import — bulk create from JSON array
router.post('/import', async (req: Request, res: Response) => {
  try {
    const rows: Array<{ name?: string; phone?: string; phoneNumber?: string; email?: string; document?: string }> =
      Array.isArray(req.body.clients) ? req.body.clients : []
    if (!rows.length) return res.status(400).json({ error: 'Nenhum dado para importar' })
    if (rows.length > 1000) return res.status(400).json({ error: 'Máximo 1000 linhas por importação' })

    // Enforce plan limits for bulk import
    const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } })
    const LIMITS: Record<string, number> = { FREE: 50, BASIC: 500, PRO: Infinity, ENTERPRISE: Infinity }
    const limit = LIMITS[tenant?.plan ?? 'FREE'] ?? 50
    const current = await prisma.client.count({ where: { tenantId: req.user.tenantId } })
    if (current >= limit) {
      return res.status(403).json({ error: 'PLAN_LIMIT', limit, current, currentPlan: tenant?.plan })
    }

    let created = 0
    let skipped = 0
    const errors: string[] = []
    const slotsLeft = limit === Infinity ? rows.length : Math.max(0, limit - current)

    for (const row of rows.slice(0, slotsLeft)) {
      const name = row.name?.trim()
      const phone = row.phone?.trim()
      if (!name || !phone) { skipped++; continue }
      const cleanPhoneNumber = row.phoneNumber ? String(row.phoneNumber).replace(/\D/g, '') || null : null
      try {
        await prisma.client.create({
          data: {
            tenantId: req.user.tenantId,
            name,
            phone,
            phoneNumber: cleanPhoneNumber,
            email: row.email?.trim() || null,
            document: row.document?.trim() || null,
          },
        })
        created++
      } catch (e: any) {
        if (e?.code === 'P2002') skipped++ // duplicate phoneNumber
        else errors.push(`${name}: ${e.message}`)
      }
    }

    return res.status(201).json({ created, skipped, errors })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
