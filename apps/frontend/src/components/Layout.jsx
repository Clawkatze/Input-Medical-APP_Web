import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { path: '/',               label: 'Dashboard',          icon: 'dashboard' },
  { path: '/products',       label: 'Productos',          icon: 'inventory_2' },
  { path: '/add-product',    label: 'Nuevo Producto',     icon: 'add_box' },
  { path: '/register-entry', label: 'Registrar Entrada',  icon: 'move_to_inbox' },
  { path: '/register-sale',  label: 'Registrar Salida',   icon: 'point_of_sale' },
  { path: '/reports',        label: 'Reportes',           icon: 'analytics' },
  { path: '/alerts',         label: 'Alertas',            icon: 'notifications' },
]

export function SideNavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const handleLogout = () => {
    signOut()
    toast.success('Sesión cerrada')
    navigate('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 z-50 flex flex-col py-8 px-4 bg-zinc-100 border-r border-zinc-200">
      <div className="mb-10 px-4">
        <h1 className="text-xl font-black text-primary tracking-tight">Input Medical</h1>
        <p className="text-xs text-on-surface-variant tracking-wider uppercase font-semibold mt-1">
          Precision Logistics
        </p>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ path, label, icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              isActive(path)
                ? 'bg-white text-primary font-bold shadow-sm translate-x-1'
                : 'text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
            <span className="font-medium text-sm">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-zinc-200">
        <div className="px-4 py-3">
          <p className="text-xs font-bold text-on-surface truncate">{user?.email}</p>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold mt-0.5">
            {user?.rol || 'Administrador'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-error hover:bg-error/5 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

export function TopNavBar({ title }) {
  return (
    <header className="fixed top-0 right-0 left-64 h-16 px-8 flex items-center bg-white/80 backdrop-blur-xl border-b border-zinc-100 z-40">
      <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
    </header>
  )
}

export function PageLayout({ title, children }) {
  return (
    <div className="bg-surface min-h-screen">
      <SideNavBar />
      <TopNavBar title={title} />
      <main className="ml-64 pt-16 p-8">
        {children}
      </main>
      <Footer />
    </div>
  )
}

export function Footer() {
  return (
    <footer className="ml-64 py-10 px-8 grid grid-cols-1 md:grid-cols-4 gap-8 bg-zinc-50 border-t border-zinc-200 text-sm">
      <div className="md:col-span-1">
        <p className="font-bold text-zinc-900 mb-2">Input Medical Chile</p>
        <p className="text-zinc-500 text-xs">Distribución de insumos médicos de alta precisión.</p>
      </div>
      <div>
        <h5 className="font-bold text-zinc-900 mb-3 uppercase text-[10px] tracking-widest">Contacto</h5>
        <ul className="space-y-1 text-zinc-500 text-xs"><li>Phone +56</li><li>Email</li></ul>
      </div>
      <div>
        <h5 className="font-bold text-zinc-900 mb-3 uppercase text-[10px] tracking-widest">Soporte</h5>
        <ul className="space-y-1 text-zinc-500 text-xs"><li>Centro de Ayuda</li><li>Manuales de Usuario</li></ul>
      </div>
      <div className="md:text-right">
        <p className="text-zinc-400 text-xs">© 2026 Input Medical Chile.</p>
      </div>
    </footer>
  )
}
