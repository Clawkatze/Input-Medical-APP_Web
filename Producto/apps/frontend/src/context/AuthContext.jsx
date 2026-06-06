import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [loading,      setLoading]      = useState(true)
  const [alertasCount, setAlertasCount] = useState(0)

  const fetchAlertasCount = useCallback(() => {
    api.get('/api/alertas/count')
      .then(({ data }) => setAlertasCount(data.total))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/api/auth/me')
        .then(({ data }) => {
          setUser(data.user)
          fetchAlertasCount()
        })
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [fetchAlertasCount])

  const signIn = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    fetchAlertasCount()
    return data.user
  }

  const signOut = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setAlertasCount(0)
  }

  // Helpers de rol
  const isSuperAdmin   = user?.rol === 'superadmin'
  const isAdmin        = user?.rol === 'admin' || isSuperAdmin
  const isBodeguero    = user?.rol === 'bodeguero' || isAdmin
  const canViewPrices  = user?.rol !== 'bodeguero'
  const canViewReports = user?.rol === 'superadmin' || user?.rol === 'admin' || user?.rol === 'visualizador'

  return (
    <AuthContext.Provider value={{
      user, loading, signIn, signOut,
      isSuperAdmin, isAdmin, isBodeguero,
      canViewPrices, canViewReports,
      alertasCount, fetchAlertasCount,
      clearAlertasCount: () => setAlertasCount(0),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
