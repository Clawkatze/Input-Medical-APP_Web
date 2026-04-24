import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import LoginPage          from './pages/LoginPage'
import DashboardPage      from './pages/DashboardPage'
import ProductsPage       from './pages/ProductsPage'
import AddProductPage     from './pages/AddProductPage'
import RegisterSalePage   from './pages/RegisterSalePage'
import ReportsPage        from './pages/ReportsPage'
import AlertsPage         from './pages/AlertsPage'
import ProductHistoryPage from './pages/ProductHistoryPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-on-surface-variant">Cargando...</p>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/"                      element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/products"              element={<PrivateRoute><ProductsPage /></PrivateRoute>} />
      <Route path="/add-product"           element={<PrivateRoute><AddProductPage /></PrivateRoute>} />
      <Route path="/register-sale"         element={<PrivateRoute><RegisterSalePage /></PrivateRoute>} />
      <Route path="/reports"               element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
      <Route path="/alerts"                element={<PrivateRoute><AlertsPage /></PrivateRoute>} />
      <Route path="/products/:id/history"  element={<PrivateRoute><ProductHistoryPage /></PrivateRoute>} />
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
