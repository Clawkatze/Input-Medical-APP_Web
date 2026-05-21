import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import { formatCLP } from '../services/precio'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const [stats,       setStats]       = useState({ total_productos: 0, stock_critico: 0, proximos_vencer: 0, movimientos_hoy: 0, ventas_hoy: 0, valor_total_inventario: 0 })
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

  // Color del badge por tipo y motivo
  const badgeColor = (row) => {
    if (row.tipo === 'ENTRADA') return 'bg-secondary-container text-on-secondary-container'
    if (row.motivo === 'MERMA') return 'bg-error-container text-on-error-container'
    return 'bg-primary/10 text-primary'
  }

  const badgeLabel = (row) => {
    if (row.tipo === 'ENTRADA') return 'ENTRADA'
    return row.motivo || 'SALIDA'
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

      {/* Stat cards */}
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

      {/* Banners económicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-r from-secondary/5 to-secondary/10 p-6 rounded-xl border border-secondary/20 flex items-center justify-between">
          <div>
            <p className="text-on-surface-variant font-semibold text-sm">Ventas del Día</p>
            <p className="text-xs text-on-surface-variant mt-1">Total facturado hoy</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary text-3xl">payments</span>
            <span className="text-3xl font-black text-secondary">{loading ? '—' : formatCLP(stats.ventas_hoy || 0)}</span>
          </div>
        </div>
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6 rounded-xl border border-primary/20 flex items-center justify-between">
          <div>
            <p className="text-on-surface-variant font-semibold text-sm">Valor Total Inventario</p>
            <p className="text-xs text-on-surface-variant mt-1">Stock actual × precio vigente</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl">account_balance_wallet</span>
            <span className="text-3xl font-black text-primary">{loading ? '—' : formatCLP(stats.valor_total_inventario || 0)}</span>
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
                <th className="px-6 py-4">Precio</th>
                <th className="px-6 py-4">V.DESC</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low text-sm">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-on-surface-variant">Cargando...</td></tr>
              ) : movimientos.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-on-surface-variant">Sin movimientos registrados</td></tr>
              ) : movimientos.map(row => (
                <tr key={row.id} className="hover:bg-surface-container-low/50">
                  <td className="px-6 py-4">{format(new Date(row.created_at), 'dd/MM HH:mm', { locale: es })}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${badgeColor(row)}`}>
                      {badgeLabel(row)}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">{row.producto_nombre}</td>
                  <td className="px-6 py-4 font-semibold">
                    {row.tipo === 'ENTRADA' ? '+' : '-'}{row.cantidad}
                  </td>
                  <td className="px-6 py-4">
                    {row.precio_unitario ? formatCLP(row.precio_unitario) : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    {row.descuento_monto > 0
                      ? <span className="text-tertiary font-bold">{formatCLP(row.descuento_monto)}</span>
                      : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-6 py-4 font-bold">
                    {row.total > 0
                      ? <span className="text-primary">{formatCLP(row.total)}</span>
                      : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-6 py-4">{row.usuario_email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  )
}
