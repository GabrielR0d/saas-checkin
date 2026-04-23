import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { User } from '../types'

interface AuthState {
  token: string | null
  user: User | null
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadFromStorage(): AuthState {
  try {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null
    return { token, user }
  } catch {
    return { token: null, user: null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadFromStorage)

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setState({ token, user })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setState({ token: null, user: null })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
