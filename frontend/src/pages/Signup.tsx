import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Wifi } from 'lucide-react'
import { signup, checkSlug } from '../api'

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function SignupPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    slug: '',
  })
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key === 'companyName') {
      setForm((prev) => ({ ...prev, companyName: value, slug: slugify(value) }))
    }
  }

  const verifySlug = useCallback(async (slug: string) => {
    if (!slug) return
    try {
      const { available } = await checkSlug(slug)
      setSlugAvailable(available)
    } catch {
      setSlugAvailable(null)
    }
  }, [])

  useEffect(() => {
    if (!form.slug) { setSlugAvailable(null); return }
    const timer = setTimeout(() => verifySlug(form.slug), 500)
    return () => clearTimeout(timer)
  }, [form.slug, verifySlug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (slugAvailable === false) return
    setError('')
    setLoading(true)
    try {
      await signup(form)
      navigate('/login')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <Wifi className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Criar conta</h1>
          <p className="text-gray-500 mt-1">Comece seu período gratuito</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {[
            { key: 'name', label: 'Seu nome', type: 'text', placeholder: 'João Silva' },
            { key: 'email', label: 'E-mail', type: 'email', placeholder: 'voce@empresa.com' },
            { key: 'password', label: 'Senha', type: 'password', placeholder: '••••••••' },
            { key: 'companyName', label: 'Nome da empresa', type: 'text', placeholder: 'Minha Empresa' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={set(key)}
                required
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              URL da sua conta
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.slug}
                onChange={set('slug')}
                required
                placeholder="minha-empresa"
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {slugAvailable === true && <CheckCircle className="w-4 h-4 text-green-500" />}
                {slugAvailable === false && <XCircle className="w-4 h-4 text-red-500" />}
              </div>
            </div>
            {slugAvailable === false && (
              <p className="text-xs text-red-600 mt-1">Esse slug já está em uso.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || slugAvailable === false}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Criando...' : 'Criar conta'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Já tem conta?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
