import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import LoginPage             from './pages/LoginPage'
import DashboardPage         from './pages/DashboardPage'
import ProductsPage          from './pages/ProductsPage'
import AddProductPage        from './pages/AddProductPage'
import RegisterEntryPage     from './pages/RegisterEntryPage'
import RegisterSalePage      from './pages/RegisterSalePage'
import ReportsPage           from './pages/ReportsPage'
import ReporteFinancieroPage from './pages/ReporteFinancieroPage'
import AlertsPage            from './pages/AlertsPage'
import ProductHistoryPage    from './pages/ProductHistoryPage'
import UsuariosPage          from './pages/UsuariosPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-on-surface-variant">Cargando...</p>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function RolRoute({ children, check }) {
  const auth = useAuth()
  if (auth.loading) return null
  if (!auth.user) return <Navigate to="/login" replace />
  if (!check(auth)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/"                     element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/products"             element={<PrivateRoute><ProductsPage /></PrivateRoute>} />
      <Route path="/alerts"               element={<PrivateRoute><AlertsPage /></PrivateRoute>} />
      <Route path="/products/:id/history" element={<PrivateRoute><ProductHistoryPage /></PrivateRoute>} />

      <Route path="/add-product"         element={<RolRoute check={a => a.isAdmin}><AddProductPage /></RolRoute>} />
      <Route path="/register-entry"      element={<RolRoute check={a => a.isBodeguero}><RegisterEntryPage /></RolRoute>} />
      <Route path="/register-sale"       element={<RolRoute check={a => a.isBodeguero}><RegisterSalePage /></RolRoute>} />
      <Route path="/reports"             element={<RolRoute check={a => a.canViewReports}><ReportsPage /></RolRoute>} />
      <Route path="/reporte-financiero"  element={<RolRoute check={a => a.canViewReports}><ReporteFinancieroPage /></RolRoute>} />
      <Route path="/usuarios"            element={<RolRoute check={a => a.isSuperAdmin}><UsuariosPage /></RolRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}