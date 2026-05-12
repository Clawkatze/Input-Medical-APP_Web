import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import { formatCLP } from '../services/precio'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const [productos,  setProductos]  = useState([])
  const [granTotal,  setGranTotal]  = useState(0)
  const [busqueda,   setBusqueda]   = useState('')
  const [loading,    setLoading]    = useState(true)
  const navigate = useNavigate()

  useEffect(() => { fetchProductos() }, [])

  async function fetchProductos() {
    setLoading(true)
    try {
      // Usamos el endpoint de valor-inventario que ya trae stock × precio calculado
      const { data } = await api.get('/api/movimientos/valor-inventario')
      setProductos(data.productos)
      setGranTotal(data.gran_total)
    } catch { toast.error('Error al cargar productos') }
    finally { setLoading(false) }
  }

  async function handleEliminar(id) {
    if (!confirm('¿Desactivar este producto?')) return
    try {
      await api.delete(`/api/productos/${id}`)
      toast.success('Producto desactivado')
      fetchProductos()
    } catch { toast.error('Error al desactivar') }
  }

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.sku.toLowerCase().includes(busqueda.toLowerCase())
  )

  // Gran total solo de los filtrados (si hay búsqueda activa)
  const totalFiltrado = filtrados.reduce((acc, p) => acc + Number(p.valor_total_producto || 0), 0)

  const estadoColor = (p) => p.stock_actual === 0 ? 'text-error' : p.stock_actual <= p.stock_minimo ? 'text-tertiary' : 'text-secondary'
  const estadoLabel = (p) => p.stock_actual === 0 ? '● Sin stock' : p.stock_actual <= p.stock_minimo ? '● Crítico' : '● OK'

  return (
    <PageLayout title="Gestión de Productos">
      <div className="space-y-6">

        {/* Buscador + botón + banner gran total */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-2xl">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-surface-container-high border-none rounded-xl outline-none focus:ring-2 focus:ring-primary"
              placeholder="Buscar por nombre o SKU..." />
          </div>
          <Link to="/add-product"
            className="h-14 px-8 bg-primary text-on-primary rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg hover:opacity-90">
            <span className="material-symbols-outlined">add_circle</span>
            Nuevo Producto
          </Link>
        </div>

        {/* Banner valor total inventario */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-5 rounded-xl border border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>
            <div>
              <p className="font-bold text-on-surface">Valor Total del Inventario</p>
              <p className="text-xs text-on-surface-variant">
                {busqueda
                  ? `Mostrando ${filtrados.length} de ${productos.length} productos`
                  : `${productos.length} productos activos`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-primary">
              {loading ? '—' : formatCLP(busqueda ? totalFiltrado : granTotal)}
            </p>
            {busqueda && (
              <p className="text-xs text-on-surface-variant mt-1">
                Total completo: {formatCLP(granTotal)}
              </p>
            )}
          </div>
        </div>

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
                  <th className="px-6 py-5">Precio Unit.</th>
                  <th className="px-6 py-5">Valor Total</th>
                  <th className="px-6 py-5">Estado</th>
                  <th className="px-6 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-on-surface-variant">Cargando...</td></tr>
                ) : filtrados.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-on-surface-variant">Sin resultados</td></tr>
                ) : filtrados.map(p => (
                  <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-mono text-sm">{p.codigo_barras || '—'}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{p.sku}</p>
                    </td>
                    <td className="px-6 py-5 font-bold">
                      <Link to={`/products/${p.id}/history`} className="hover:text-primary">{p.nombre}</Link>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">
                        {p.categoria_nombre || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-semibold">{p.stock_actual.toLocaleString('es-CL')}</p>
                      <p className="text-xs text-on-surface-variant">mín. {p.stock_minimo}</p>
                    </td>
                    <td className="px-6 py-5 font-bold text-secondary">
                      {p.precio_unitario ? formatCLP(p.precio_unitario) : <span className="text-zinc-300 font-normal">Sin precio</span>}
                    </td>
                    <td className="px-6 py-5 font-bold text-primary">
                      {p.precio_unitario ? formatCLP(p.valor_total_producto) : <span className="text-zinc-300 font-normal">—</span>}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`font-bold text-sm ${estadoColor(p)}`}>{estadoLabel(p)}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button onClick={() => navigate(`/add-product?edit=${p.id}`)} className="p-2 hover:bg-zinc-100 rounded-lg" title="Editar">
                        <span className="material-symbols-outlined text-zinc-500">edit</span>
                      </button>
                      <button onClick={() => handleEliminar(p.id)} className="p-2 hover:bg-zinc-100 rounded-lg" title="Desactivar">
                        <span className="material-symbols-outlined text-zinc-500">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Pie de tabla con gran total */}
              {!loading && filtrados.length > 0 && (
                <tfoot>
                  <tr className="bg-zinc-50 border-t-2 border-zinc-200">
                    <td colSpan={5} className="px-6 py-4 text-right font-black text-sm text-on-surface-variant uppercase tracking-wider">
                      {busqueda ? `Total filtrado (${filtrados.length} productos)` : `Gran Total (${productos.length} productos)`}
                    </td>
                    <td className="px-6 py-4 font-black text-xl text-primary">
                      {formatCLP(busqueda ? totalFiltrado : granTotal)}
                    </td>
                    <td colSpan={2} />
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
