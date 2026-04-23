import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import { useAuth } from '../store/auth'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.accessToken, data.user)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-400 mb-2">CheckIn SaaS</h1>
          <p className="text-slate-400">Entre na sua conta</p>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Não tem conta?{' '}
            <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
