import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/api/auth/me')
        .then(({ data }) => setUser(data.user))
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const signIn = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const signOut = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  // Helpers de rol
  const isSuperAdmin  = user?.rol === 'superadmin'
  const isAdmin       = user?.rol === 'admin' || isSuperAdmin
  const isBodeguero   = user?.rol === 'bodeguero' || isAdmin
  const canViewPrices = user?.rol !== 'bodeguero'
  const canViewReports = user?.rol === 'superadmin' || user?.rol === 'admin' || user?.rol === 'visualizador'

  return (
    <AuthContext.Provider value={{
      user, loading, signIn, signOut,
      isSuperAdmin, isAdmin, isBodeguero,
      canViewPrices, canViewReports,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
