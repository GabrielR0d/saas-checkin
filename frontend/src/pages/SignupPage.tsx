import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../lib/api'

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function SignupPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    slug: '',
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function setField(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'companyName') {
        next.slug = toSlug(value)
      }
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/signup', form)
      toast.success('Conta criada com sucesso! Faça login.')
      navigate('/login')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-400 mb-2">CheckIn SaaS</h1>
          <p className="text-slate-400">Crie sua conta</p>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome completo</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                required
                placeholder="João Silva"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                required
                minLength={6}
                placeholder="mín. 6 caracteres"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nome da empresa</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setField('companyName', e.target.value)}
                required
                placeholder="Minha Academia"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Slug (URL)</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setField('slug', e.target.value)}
                required
                placeholder="minha-academia"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
              <p className="mt-1 text-xs text-slate-500">Usado como identificador único do seu negócio</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors mt-2"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Já tem conta?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
