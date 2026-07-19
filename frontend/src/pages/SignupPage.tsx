import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, X, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function SignupPage() {
  const { login } = useAuth()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    slug: '',
  })
  const [loading, setLoading] = useState(false)
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const navigate = useNavigate()

  // Debounced slug availability check
  useEffect(() => {
    const slug = form.slug
    if (!slug || slug.length < 2) { setSlugStatus('idle'); return }
    setSlugStatus('checking')
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/auth/check-slug', { params: { slug } })
        setSlugStatus(data.available ? 'available' : 'taken')
      } catch {
        setSlugStatus('idle')
      }
    }, 500)
    return () => clearTimeout(t)
  }, [form.slug])

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
      const { data } = await api.post('/auth/signup', form)
      login(data.accessToken, data.user)
      toast.success('Conta criada com sucesso! Bem-vindo(a)!')
      navigate('/')
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { error?: unknown; message?: string } } })?.response?.data
      const rawError = errData?.error
      // Zod validation errors come back as an array of { message } objects
      const msg = Array.isArray(rawError)
        ? (rawError as { message: string }[]).map((e) => e.message).join(', ')
        : (rawError as string | undefined) ?? errData?.message
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
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Palavra-passe</label>
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
              <div className="relative">
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => { setField('slug', e.target.value); setSlugStatus('idle') }}
                  required
                  placeholder="minha-academia"
                  className={`w-full bg-slate-800 border text-slate-100 rounded-lg px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 placeholder:text-slate-500 ${
                    slugStatus === 'taken'
                      ? 'border-red-500 focus:ring-red-500'
                      : slugStatus === 'available'
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-slate-700 focus:ring-indigo-500'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugStatus === 'checking' && <Loader size={14} className="text-slate-500 animate-spin" />}
                  {slugStatus === 'available' && <Check size={14} className="text-green-400" />}
                  {slugStatus === 'taken' && <X size={14} className="text-red-400" />}
                </span>
              </div>
              <p className={`mt-1 text-xs ${
                slugStatus === 'taken' ? 'text-red-400' :
                slugStatus === 'available' ? 'text-green-400' :
                'text-slate-500'
              }`}>
                {slugStatus === 'taken'
                  ? 'Este slug já está em uso'
                  : slugStatus === 'available'
                  ? 'Disponível!'
                  : 'Usado como identificador único do seu negócio'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || slugStatus === 'taken' || slugStatus === 'checking'}
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
