import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import { formatCLP } from '../services/precio'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const [stats,       setStats]       = useState({
    total_productos: 0, stock_critico: 0, proximos_vencer: 0,
    movimientos_hoy: 0, ventas_hoy: 0, mermas_hoy: 0,
    descuentos_hoy: 0, valor_total_inventario: 0
  })
  const [movimientos, setMovimientos] = useState([])
  const [alertas,     setAlertas]     = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      const [statsRes, movsRes, alertasRes] = await Promise.all([
        api.get('/api/movimientos/dashboard-stats'),
        api.get('/api/movimientos?limit=10'),
        api.get('/api/movimientos/alertas'),
      ])
      setStats(statsRes.data)
      setMovimientos(movsRes.data)
      setAlertas(alertasRes.data)
    } catch {
      toast.error('Error al cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/api/reportes/movimientos', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'movimientos.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Error al exportar') }
  }

  const STAT_CARDS = [
    { label: 'Total Productos',   val: stats.total_productos,  sub: 'productos activos',  color: 'text-primary',   icon: 'inventory' },
    { label: 'Stock Crítico',     val: stats.stock_critico,    sub: 'Acción requerida',   color: 'text-error',     icon: 'trending_down' },
    { label: 'Próximos a Vencer', val: stats.proximos_vencer,  sub: 'Próximos 30 días',  color: 'text-tertiary',  icon: 'schedule' },
    { label: 'Movimientos Hoy',   val: stats.movimientos_hoy,  sub: 'Transacciones',      color: 'text-secondary', icon: 'sync_alt' },
  ]

  // Badge de tipo/motivo con color diferenciado
  const getBadge = (row) => {
    if (row.tipo === 'ENTRADA')      return { label: 'ENTRADA',  cls: 'bg-secondary-container text-on-secondary-container' }
    if (row.motivo === 'MERMA')      return { label: 'MERMA',    cls: 'bg-error text-white' }
    if (row.motivo === 'TRASLADO')   return { label: 'TRASLADO', cls: 'bg-zinc-200 text-zinc-700' }
    if (row.motivo === 'AJUSTE')     return { label: 'AJUSTE',   cls: 'bg-zinc-200 text-zinc-700' }
    return { label: 'VENTA', cls: 'bg-primary/10 text-primary' }
  }

  // Color del precio según tipo de movimiento
  const getPrecioColor = (row) => {
    if (row.tipo === 'ENTRADA') return 'text-secondary'   // precio de costo → verde
    if (row.motivo === 'MERMA') return 'text-error'       // pérdida → rojo
    return 'text-primary'                                  // venta → azul
  }

  // Prefijo del total según tipo
  const getTotalDisplay = (row) => {
    if (!row.total || row.total <= 0) return null
    if (row.motivo === 'MERMA') return { valor: `-${formatCLP(row.total)}`, color: 'text-error' }
    if (row.tipo === 'ENTRADA') return { valor: formatCLP(row.total), color: 'text-secondary' }
    return { valor: formatCLP(row.total), color: 'text-primary' }
  }

  return (
    <PageLayout title="Panel de Control">
      {alertas.length > 0 && (
        <div className="mb-6 bg-tertiary-fixed text-on-tertiary-fixed p-4 rounded-xl flex items-center justify-between border-l-4 border-tertiary shadow-sm">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-tertiary">warning</span>
            <span className="font-medium">⚠️ Tienes {alertas.length} producto{alertas.length > 1 ? 's' : ''} con alertas</span>
          </div>
          <Link to="/alerts" className="text-tertiary font-bold text-sm hover:underline">Ver Detalles</Link>
        </div>
      )}

      {/* 4 stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
        {STAT_CARDS.map((item, idx) => (
          <div key={idx} className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/15 hover:bg-surface-bright transition-all">
            <p className="text-on-surface-variant font-semibold text-sm">{item.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-4xl font-bold ${item.color}`}>{loading ? '—' : item.val}</span>
              <span className="material-symbols-outlined text-sm text-on-surface-variant">{item.icon}</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-4">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* 4 banners económicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {/* Ventas del día */}
        <div className="bg-gradient-to-r from-secondary/5 to-secondary/10 p-5 rounded-xl border border-secondary/20 flex items-center justify-between">
          <div>
            <p className="text-on-surface-variant font-semibold text-sm">Ventas del Día</p>
            <p className="text-xs text-on-surface-variant mt-1">Ingresos por ventas</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">payments</span>
            <span className="text-2xl font-black text-secondary">
              {loading ? '—' : formatCLP(stats.ventas_hoy || 0)}
            </span>
          </div>
        </div>

        {/* Descuentos aplicados */}
        <div className="bg-gradient-to-r from-tertiary/5 to-tertiary/10 p-5 rounded-xl border border-tertiary/20 flex items-center justify-between">
          <div>
            <p className="text-on-surface-variant font-semibold text-sm">Descuentos Aplicados</p>
            <p className="text-xs text-on-surface-variant mt-1">Total descontado hoy</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-2xl">local_offer</span>
            <span className="text-2xl font-black text-tertiary">
              {loading ? '—' : formatCLP(stats.descuentos_hoy || 0)}
            </span>
          </div>
        </div>

        {/* Pérdidas por merma */}
        <div className="bg-gradient-to-r from-error/5 to-error/10 p-5 rounded-xl border border-error/20 flex items-center justify-between">
          <div>
            <p className="text-on-surface-variant font-semibold text-sm">Pérdidas por Merma</p>
            <p className="text-xs text-on-surface-variant mt-1">Productos dados de baja</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-2xl">delete_sweep</span>
            <span className="text-2xl font-black text-error">
              {loading ? '—' : stats.mermas_hoy > 0 ? `-${formatCLP(stats.mermas_hoy)}` : formatCLP(0)}
            </span>
          </div>
        </div>

        {/* Valor total inventario */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-5 rounded-xl border border-primary/20 flex items-center justify-between">
          <div>
            <p className="text-on-surface-variant font-semibold text-sm">Valor Total Inventario</p>
            <p className="text-xs text-on-surface-variant mt-1">Stock × precio vigente</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>
            <span className="text-2xl font-black text-primary">
              {loading ? '—' : formatCLP(stats.valor_total_inventario || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabla movimientos recientes */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/15 overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Movimientos Recientes</h2>
          <button onClick={handleExportCSV} className="px-4 py-2 text-sm font-medium text-primary bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors">
            Descargar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Fecha/Hora</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Cant.</th>
                <th className="px-6 py-4">Precio Unit.</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low text-sm">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">Cargando...</td></tr>
              ) : movimientos.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">Sin movimientos registrados</td></tr>
              ) : movimientos.map(row => {
                const badge   = getBadge(row)
                const total   = getTotalDisplay(row)
                return (
                  <tr key={row.id} className="hover:bg-surface-container-low/50">
                    <td className="px-6 py-4">{format(new Date(row.created_at), 'dd/MM HH:mm', { locale: es })}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{row.producto_nombre}</td>
                    <td className="px-6 py-4 font-semibold">
                      {row.tipo === 'ENTRADA' ? '+' : '-'}{row.cantidad}
                    </td>
                    <td className="px-6 py-4">
                      {row.precio_unitario > 0
                        ? <span className={`font-medium ${getPrecioColor(row)}`}>
                            {formatCLP(row.precio_unitario)}
                            {row.tipo === 'ENTRADA'
                              ? <span className="text-[10px] ml-1 text-zinc-400">costo</span>
                              : <span className="text-[10px] ml-1 text-zinc-400">venta</span>}
                          </span>
                        : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-6 py-4 font-bold">
                      {total
                        ? <span className={total.color}>{total.valor}</span>
                        : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-6 py-4">{row.usuario_email || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  )
}
