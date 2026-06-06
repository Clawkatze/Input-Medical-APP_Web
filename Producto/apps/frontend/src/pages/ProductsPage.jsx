import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import { formatCLP, tieneDescuento } from '../services/precio'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const [productos,        setProductos]        = useState([])
  const [granTotal,        setGranTotal]        = useState(0)
  const [busqueda,         setBusqueda]         = useState('')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [filtroCritico,    setFiltroCritico]    = useState(false)
  const [loading,          setLoading]          = useState(true)
  const navigate    = useNavigate()
  const { isAdmin } = useAuth()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // Si viene desde el dashboard con ?filtro=critico, activar filtro
    if (searchParams.get('filtro') === 'critico') setFiltroCritico(true)
    fetchProductos()
  }, [mostrarInactivos])

  async function fetchProductos() {
    setLoading(true)
    try {
      const params = mostrarInactivos ? { mostrar_inactivos: 'true' } : {}
      const { data } = await api.get('/api/movimientos/valor-inventario', { params })
      setProductos(data.productos)
      setGranTotal(data.gran_total)
    } catch { toast.error('Error al cargar productos') }
    finally { setLoading(false) }
  }

  async function handleDesactivar(id) {
    if (!confirm('¿Desactivar este producto? Podrás reactivarlo después.')) return
    try {
      await api.delete(`/api/productos/${id}`)
      toast.success('Producto desactivado')
      fetchProductos()
    } catch { toast.error('Error al desactivar') }
  }

  async function handleReactivar(id, nombre) {
    if (!confirm(`¿Reactivar "${nombre}"?`)) return
    try {
      await api.put(`/api/productos/${id}/reactivar`)
      toast.success('Producto reactivado correctamente')
      fetchProductos()
    } catch { toast.error('Error al reactivar') }
  }

  async function handleEliminarPermanente(id, nombre) {
    const confirmacion = confirm(
      `⚠️ ELIMINAR PERMANENTEMENTE\n\n` +
      `Producto: "${nombre}"\n\n` +
      `Esta acción no se puede deshacer. El producto será eliminado del sistema.\n` +
      `El historial de movimientos se conservará con todos sus datos.\n\n` +
      `¿Confirmas la eliminación permanente?`
    )
    if (!confirmacion) return
    try {
      await api.delete(`/api/productos/${id}/permanente`)
      toast.success('Producto eliminado permanentemente')
      fetchProductos()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar')
    }
  }

  // Filtros acumulativos
  const filtrados = productos.filter(p => {
    const matchBusqueda = !busqueda ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.sku.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo_barras || '').includes(busqueda)
    const matchCritico = !filtroCritico || (p.stock_actual <= p.stock_minimo && p.activo)
    return matchBusqueda && matchCritico
  })

  const totalFiltrado = filtrados.filter(p => p.activo).reduce((acc, p) => acc + Number(p.valor_total_producto || 0), 0)
  const inactivosCount = productos.filter(p => !p.activo).length

  const estadoColor = (p) => {
    if (!p.activo) return 'text-zinc-400'
    if (p.stock_actual === 0) return 'text-error'
    if (p.stock_actual <= p.stock_minimo) return 'text-tertiary'
    return 'text-secondary'
  }
  const estadoLabel = (p) => {
    if (!p.activo) return '● Inactivo'
    if (p.stock_actual === 0) return '● Sin stock'
    if (p.stock_actual <= p.stock_minimo) return '● Crítico'
    return '● OK'
  }

  return (
    <PageLayout title="Gestión de Productos">
      <div className="space-y-6">

        {/* Buscador + botones */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-2xl">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-surface-container-high border-none rounded-xl outline-none focus:ring-2 focus:ring-primary"
              placeholder="Buscar por nombre, SKU o código de barras..." />
          </div>
          <div className="flex gap-3 flex-wrap">
            {/* Filtro stock crítico */}
            <button onClick={() => setFiltroCritico(!filtroCritico)}
              className={`h-14 px-5 rounded-xl font-bold flex items-center gap-2 border-2 transition-all ${
                filtroCritico
                  ? 'bg-error/10 border-error text-error'
                  : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
              }`}>
              <span className="material-symbols-outlined text-[20px]">trending_down</span>
              <span className="text-sm">{filtroCritico ? 'Ver todos' : 'Solo críticos'}</span>
            </button>
            <button onClick={() => setMostrarInactivos(!mostrarInactivos)}
              className={`h-14 px-5 rounded-xl font-bold flex items-center gap-2 border-2 transition-all ${
                mostrarInactivos
                  ? 'bg-zinc-200 border-zinc-400 text-zinc-700'
                  : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
              }`}>
              <span className="material-symbols-outlined text-[20px]">
                {mostrarInactivos ? 'visibility' : 'visibility_off'}
              </span>
              <span className="text-sm">
                {mostrarInactivos ? 'Ocultar inactivos' : `Inactivos${inactivosCount > 0 ? ` (${inactivosCount})` : ''}`}
              </span>
            </button>
            {isAdmin && (
              <Link to="/add-product"
                className="h-14 px-8 bg-primary text-on-primary rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg hover:opacity-90">
                <span className="material-symbols-outlined">add_circle</span>
                Nuevo Producto
              </Link>
            )}
          </div>
        </div>

        {/* Aviso filtro activo */}
        {filtroCritico && (
          <div className="bg-error/5 border border-error/20 p-3 rounded-xl flex items-center gap-3 text-sm text-error">
            <span className="material-symbols-outlined text-[18px]">filter_alt</span>
            Mostrando solo productos con stock crítico o sin stock.
            <button onClick={() => setFiltroCritico(false)} className="ml-auto font-bold hover:underline">Quitar filtro</button>
          </div>
        )}

        {/* Banner valor total */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-5 rounded-xl border border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>
            <div>
              <p className="font-bold text-on-surface">Valor Total del Inventario</p>
              <p className="text-xs text-on-surface-variant">Solo productos activos · precio vigente</p>
            </div>
          </div>
          <p className="text-3xl font-black text-primary">
            {loading ? '—' : formatCLP(busqueda || filtroCritico ? totalFiltrado : granTotal)}
          </p>
        </div>

        {/* Aviso inactivos */}
        {mostrarInactivos && inactivosCount > 0 && (
          <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl flex items-center gap-3 text-sm text-zinc-600">
            <span className="material-symbols-outlined text-zinc-400">info</span>
            Los productos inactivos pueden ser <strong>reactivados</strong> o <strong>eliminados permanentemente</strong>. La eliminación es irreversible pero conserva el historial de movimientos.
          </div>
        )}

        {/* Tabla */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden border border-zinc-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-b text-xs uppercase font-bold text-zinc-500">
                  <th className="px-6 py-5">Barcode / SKU</th>
                  <th className="px-6 py-5">Nombre</th>
                  <th className="px-6 py-5">Categoría</th>
                  <th className="px-6 py-5">Stock</th>
                  <th className="px-6 py-5">Precio Normal</th>
                  <th className="px-6 py-5">V.DESC</th>
                  <th className="px-6 py-5">Valor Total</th>
                  <th className="px-6 py-5">Estado</th>
                  {isAdmin && <th className="px-6 py-5 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr><td colSpan={isAdmin ? 9 : 8} className="px-6 py-10 text-center text-on-surface-variant">Cargando...</td></tr>
                ) : filtrados.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 9 : 8} className="px-6 py-10 text-center text-on-surface-variant">Sin resultados</td></tr>
                ) : filtrados.map(p => (
                  <tr key={p.id} className={`transition-colors ${p.activo ? 'hover:bg-zinc-50' : 'bg-zinc-50 opacity-60'}`}>
                    <td className="px-6 py-5">
                      <p className="font-mono text-sm font-bold">{p.codigo_barras || '—'}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{p.sku}</p>
                    </td>
                    <td className="px-6 py-5 font-bold">
                      {p.activo
                        ? <Link to={`/products/${p.id}/history`} className="hover:text-primary">{p.nombre}</Link>
                        : <span className="text-zinc-400 line-through">{p.nombre}</span>}
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">
                        {p.categoria_nombre || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-semibold">{p.stock_actual?.toLocaleString('es-CL') ?? 0}</p>
                      <p className="text-xs text-zinc-400">mín. {p.stock_minimo}</p>
                    </td>
                    <td className="px-6 py-5">
                      {p.precio_unitario
                        ? <span className={`font-medium ${tieneDescuento(p) ? 'line-through text-zinc-400 text-sm' : 'text-on-surface font-bold'}`}>
                            {formatCLP(p.precio_unitario)}
                          </span>
                        : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-6 py-5">
                      {tieneDescuento(p)
                        ? <span className="font-black text-tertiary">{formatCLP(p.precio_descuento)}</span>
                        : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-6 py-5 font-bold text-primary">
                      {p.activo && p.precio_vigente
                        ? formatCLP(p.valor_total_producto)
                        : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`font-bold text-sm ${estadoColor(p)}`}>{estadoLabel(p)}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-5 text-right">
                        {p.activo ? (
                          <>
                            <button onClick={() => navigate(`/add-product?edit=${p.id}`)}
                              className="p-2 hover:bg-zinc-100 rounded-lg" title="Editar">
                              <span className="material-symbols-outlined text-zinc-500">edit</span>
                            </button>
                            <button onClick={() => handleDesactivar(p.id)}
                              className="p-2 hover:bg-zinc-100 rounded-lg" title="Desactivar">
                              <span className="material-symbols-outlined text-zinc-500">person_off</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleReactivar(p.id, p.nombre)}
                              className="p-2 hover:bg-green-50 rounded-lg" title="Reactivar">
                              <span className="material-symbols-outlined text-secondary">restart_alt</span>
                            </button>
                            <button onClick={() => handleEliminarPermanente(p.id, p.nombre)}
                              className="p-2 hover:bg-red-50 rounded-lg" title="Eliminar permanentemente">
                              <span className="material-symbols-outlined text-error">delete_forever</span>
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {!loading && filtrados.filter(p => p.activo).length > 0 && (
                <tfoot>
                  <tr className="bg-zinc-50 border-t-2 border-zinc-200">
                    <td colSpan={6} className="px-6 py-4 text-right font-black text-sm text-on-surface-variant uppercase tracking-wider">
                      {busqueda || filtroCritico
                        ? `Total filtrado (${filtrados.filter(p=>p.activo).length} activos)`
                        : `Gran Total (${productos.filter(p=>p.activo).length} productos activos)`}
                    </td>
                    <td className="px-6 py-4 font-black text-xl text-primary">
                      {formatCLP(busqueda || filtroCritico ? totalFiltrado : granTotal)}
                    </td>
                    <td colSpan={isAdmin ? 2 : 1} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
