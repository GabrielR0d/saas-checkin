import { useQuery, useMutation } from '@tanstack/react-query'
import { Check, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'

interface Plan {
  id: string
  name: string
  price: number
  interval: string
  features: string[]
  isCurrent?: boolean
}

export function BillingPage() {
  const { user } = useAuth()

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['billing/plans'],
    queryFn: async () => (await api.get('/billing/plans')).data,
  })

  const checkout = useMutation({
    mutationFn: async (planId: string) => {
      const { data } = await api.post('/billing/checkout', { planId })
      return data
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      }
    },
    onError: () => toast.error('Erro ao iniciar checkout'),
  })

  const FALLBACK_PLANS: Plan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 0,
      interval: 'mês',
      features: ['Até 50 participantes', '2 dispositivos', 'Histórico 30 dias', 'Suporte email'],
      isCurrent: user?.role === 'FREE',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 97,
      interval: 'mês',
      features: ['Até 500 participantes', '10 dispositivos', 'Histórico ilimitado', 'Notificações WhatsApp', 'Suporte prioritário'],
      isCurrent: user?.role === 'PRO',
    },
    {
      id: 'business',
      name: 'Business',
      price: 297,
      interval: 'mês',
      features: ['Participantes ilimitados', 'Dispositivos ilimitados', 'Histórico ilimitado', 'WhatsApp + SMS', 'API própria', 'SLA 99.9%'],
      isCurrent: user?.role === 'BUSINESS',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: -1,
      interval: 'mês',
      features: ['Tudo do Business', 'Multi-tenant', 'SSO / SAML', 'Onboarding dedicado', 'Contrato personalizado'],
      isCurrent: user?.role === 'ENTERPRISE',
    },
  ]

  const displayPlans = plans ?? (isLoading ? [] : FALLBACK_PLANS)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Planos</h1>
        <p className="text-slate-400 text-sm mt-1">Escolha o plano ideal para o seu negócio</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Carregando planos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {displayPlans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-slate-900 rounded-xl border p-6 flex flex-col gap-5 relative ${
                plan.isCurrent
                  ? 'border-indigo-500 ring-1 ring-indigo-500'
                  : 'border-slate-800'
              }`}
            >
              {plan.isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-medium px-3 py-0.5 rounded-full">
                  Plano atual
                </span>
              )}

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={18} className={plan.isCurrent ? 'text-indigo-400' : 'text-slate-500'} />
                  <h3 className="font-semibold text-slate-100">{plan.name}</h3>
                </div>
                <div className="mt-3">
                  {plan.price === -1 ? (
                    <span className="text-2xl font-bold text-slate-100">Sob consulta</span>
                  ) : plan.price === 0 ? (
                    <span className="text-2xl font-bold text-slate-100">Grátis</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-slate-400">R$</span>
                      <span className="text-3xl font-bold text-slate-100">{plan.price}</span>
                      <span className="text-sm text-slate-400">/{plan.interval}</span>
                    </div>
                  )}
                </div>
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  if (plan.price === -1) {
                    window.open('mailto:contato@exemplo.com?subject=Enterprise', '_blank')
                    return
                  }
                  checkout.mutate(plan.id)
                }}
                disabled={plan.isCurrent || checkout.isPending}
                className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  plan.isCurrent
                    ? 'bg-slate-800 text-slate-500 cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50'
                }`}
              >
                {plan.isCurrent
                  ? 'Plano atual'
                  : plan.price === -1
                  ? 'Falar com vendas'
                  : plan.price === 0
                  ? 'Usar grátis'
                  : 'Fazer upgrade'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
