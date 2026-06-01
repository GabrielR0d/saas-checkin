import { Router } from 'express'
import Stripe from 'stripe'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'

const router = Router()

const PLANS = [
  { id: 'FREE', name: 'Free', price: 0, currency: 'BRL', limits: { clients: 50, cards: 10, devices: 2 }, features: ['50 clientes', '10 cartões', '2 dispositivos', 'Notificações WhatsApp'] },
  { id: 'BASIC', name: 'Basic', price: 4900, currency: 'BRL', priceId: process.env.STRIPE_BASIC_PRICE_ID, limits: { clients: 500, cards: 100, devices: 10 }, features: ['500 clientes', '100 cartões', '10 dispositivos', 'Notificações WhatsApp', 'Relatórios CSV'] },
  { id: 'PRO', name: 'Pro', price: 14900, currency: 'BRL', priceId: process.env.STRIPE_PRO_PRICE_ID, limits: { clients: -1, cards: -1, devices: -1 }, features: ['Clientes ilimitados', 'Cartões ilimitados', 'Dispositivos ilimitados', 'Notificações WhatsApp', 'Relatórios CSV', 'Suporte prioritário'] },
  { id: 'ENTERPRISE', name: 'Enterprise', price: -1, currency: 'BRL', limits: { clients: -1, cards: -1, devices: -1 }, features: ['Tudo do Pro', 'SLA garantido', 'Onboarding dedicado', 'API personalizada'] },
]

router.get('/plans', (req, res) => {
  return res.json(PLANS)
})

router.post('/checkout', authenticate, async (req, res) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const { plan } = req.body
    const planData = PLANS.find(p => p.id === plan)
    if (!planData || !planData.priceId) return res.status(400).json({ error: 'Invalid plan' })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: planData.priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/plans?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/plans`,
      metadata: { tenantId: req.user.tenantId, plan },
    })
    return res.json({ url: session.url })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

router.post('/webhook', async (req, res) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const sig = req.headers['stripe-signature'] as string
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const { tenantId, plan } = session.metadata!
      await prisma.tenant.update({ where: { id: tenantId }, data: { plan: plan as any, stripeCustomerId: session.customer as string, stripeSubscriptionId: session.subscription as string } })
    }
    return res.json({ received: true })
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

export default router
