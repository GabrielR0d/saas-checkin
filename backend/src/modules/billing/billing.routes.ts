import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import prisma from '../../lib/prisma'
import { authenticate } from '../../middlewares/auth.middleware'

const router = Router()

const PLANS = [
  {
    id: 'FREE', name: 'Free', price: 0,
    features: ['50 clientes', '10 cartões', '2 dispositivos', 'Notificações WhatsApp'],
    limits: { clients: 50, cards: 10, devices: 2 },
  },
  {
    id: 'BASIC', name: 'Basic', price: 4900,
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
    features: ['500 clientes', '100 cartões', '10 dispositivos', 'Notificações WhatsApp', 'Exportar CSV'],
    limits: { clients: 500, cards: 100, devices: 10 },
  },
  {
    id: 'PRO', name: 'Pro', price: 14900,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: ['Ilimitado', 'Suporte prioritário', 'Exportar CSV', 'App mobile'],
    limits: { clients: -1, cards: -1, devices: -1 },
  },
  {
    id: 'ENTERPRISE', name: 'Enterprise', price: -1,
    features: ['Tudo do Pro', 'SLA garantido', 'Onboarding dedicado'],
    limits: { clients: -1, cards: -1, devices: -1 },
  },
]

router.get('/plans', (_req, res) => res.json(PLANS))

router.post('/checkout', authenticate, async (req: Request, res: Response) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const { plan } = req.body
    const planData = PLANS.find((p) => p.id === plan)
    if (!planData?.priceId) return res.status(400).json({ error: 'Invalid plan or no priceId configured' })

    const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173'
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: planData.priceId, quantity: 1 }],
      success_url: `${origin}/plans?success=true`,
      cancel_url: `${origin}/plans`,
      metadata: { tenantId: req.user.tenantId, plan },
    })
    return res.json({ url: session.url })
  } catch (err: any) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
})

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const sig = req.headers['stripe-signature'] as string
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const { tenantId, plan } = session.metadata ?? {}
      if (tenantId && plan) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            plan: plan as any,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          },
        })
      }
    }
    return res.json({ received: true })
  } catch (err: any) {
    console.error('[Stripe Webhook]', err.message)
    return res.status(400).json({ error: err.message })
  }
})

export default router
