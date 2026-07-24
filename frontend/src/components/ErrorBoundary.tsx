import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  /** Optional custom fallback — defaults to the built-in PT-PT error card */
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state

    if (error) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-xl font-semibold text-slate-100">Ocorreu um erro inesperado</h1>
            <p className="text-slate-400 text-sm">
              Algo correu mal ao carregar esta página. Pode tentar recarregar ou voltar ao início.
            </p>
            {import.meta.env.DEV && (
              <pre className="text-left text-xs text-red-400 bg-slate-800 rounded-lg p-3 overflow-auto max-h-40">
                {error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Recarregar página
              </button>
              <button
                onClick={() => { window.location.href = '/' }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
              >
                Ir para o início
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
