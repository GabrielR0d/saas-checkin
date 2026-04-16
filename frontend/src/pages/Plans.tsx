import { useQuery } from '@tanstack/react-query'
import { Check, Zap } from 'lucide-react'
import { getPlans, createCheckout } from '../api'
import { useAuthStore } from '../stores/auth.store'
import type { PlanInfo, Plan } from '../types'

const PLAN_COLORS: Record<Plan, string> = {
  FREE: 'border-gray-200',
  BASIC: 'border-blue-200',
  PRO: 'border-purple-300',
  ENTERPRISE: 'border-gray-400',
}

const PLAN_HIGHLIGHTS: Record<Plan, string> = {
  FREE: '',
  BASIC: 'ring-2 ring-blue-500',
  PRO: 'ring-2 ring-purple-500',
  ENTERPRISE: '',
}

function formatLimit(n: number | null) {
  return n === null ? 'Ilimitado' : n.toLocaleString('pt-BR')
}

export default function PlansPage() {
  const user = useAuthStore((s) => s.user)

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: getPlans,
  })

  const handleUpgrade = async (planName: string) => {
    if (planName === 'ENTERPRISE') {
      window.open('mailto:contato@saascheckin.com?subject=Plano Enterprise', '_blank')
      return
    }
    try {
      const { url } = await createCheckout(planName)
      window.location.href = url
    } catch {
      alert('Erro ao iniciar checkout. Tente novamente.')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Planos</h1>
        <p className="text-sm text-gray-500 mt-1">Escolha o plano ideal para o seu negócio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {(plans ?? []).map((plan: PlanInfo) => {
          const isCurrent = plan.name === (user as unknown as { plan?: Plan })?.plan
          return (
            <div
              key={plan.name}
              className={`bg-white rounded-2xl border p-6 flex flex-col ${PLAN_COLORS[plan.name]} ${PLAN_HIGHLIGHTS[plan.name]}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-gray-900 text-lg">{plan.name}</h2>
                {isCurrent && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    Plano atual
                  </span>
                )}
              </div>

              <div className="mb-4">
                {plan.price === 0 ? (
                  <span className="text-3xl font-bold text-gray-900">Grátis</span>
                ) : plan.name === 'ENTERPRISE' ? (
                  <span className="text-xl font-bold text-gray-600">Consultar</span>
                ) : (
                  <span className="text-3xl font-bold text-gray-900">
                    R$ {plan.price}
                    <span className="text-sm font-normal text-gray-500">/mês</span>
                  </span>
                )}
              </div>

              {/* Limits */}
              <div className="space-y-1 mb-4 text-xs text-gray-600">
                <p>👥 {formatLimit(plan.limits.clients)} clientes</p>
                <p>💳 {formatLimit(plan.limits.cards)} cartões</p>
                <p>📡 {formatLimit(plan.limits.devices)} leitores</p>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.name)}
                disabled={isCurrent}
                className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : plan.name === 'PRO'
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : plan.name === 'BASIC'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : plan.name === 'ENTERPRISE'
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {!isCurrent && plan.name !== 'FREE' && <Zap className="w-4 h-4" />}
                {isCurrent ? 'Plano atual' : plan.name === 'ENTERPRISE' ? 'Falar com vendas' : 'Fazer upgrade'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
