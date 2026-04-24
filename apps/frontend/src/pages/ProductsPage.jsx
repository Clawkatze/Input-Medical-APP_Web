import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const [productos, setProductos] = useState([])
  const [busqueda,  setBusqueda]  = useState('')
  const [loading,   setLoading]   = useState(true)
  const navigate = useNavigate()

  useEffect(() => { fetchProductos() }, [])

  async function fetchProductos() {
    setLoading(true)
    try {
      const { data } = await api.get('/api/productos')
      setProductos(data)
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
    p.sku.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.codigo_barras || '').includes(busqueda)
  )

  const estadoColor = (p) => p.stock_actual === 0 ? 'text-error' : p.stock_actual <= p.stock_minimo ? 'text-tertiary' : 'text-secondary'
  const estadoLabel = (p) => p.stock_actual === 0 ? '● Sin stock' : p.stock_actual <= p.stock_minimo ? '● Crítico' : '● OK'

  return (
    <PageLayout title="Gestión de Productos">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-2xl">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-surface-container-high border-none rounded-xl outline-none focus:ring-2 focus:ring-primary"
              placeholder="Buscar por nombre, SKU o código..."
            />
          </div>
          <Link to="/add-product" className="h-14 px-8 bg-primary text-on-primary rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg hover:opacity-90">
            <span className="material-symbols-outlined">add_circle</span>
            Agregar Producto
          </Link>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden border border-zinc-100">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low border-b text-xs uppercase font-bold text-zinc-500">
                <th className="px-6 py-5">Barcode / SKU</th>
                <th className="px-6 py-5">Nombre</th>
                <th className="px-6 py-5">Categoría</th>
                <th className="px-6 py-5">Stock Actual</th>
                <th className="px-6 py-5">Stock Mín.</th>
                <th className="px-6 py-5">Estado</th>
                <th className="px-6 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-on-surface-variant">Cargando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-on-surface-variant">Sin resultados</td></tr>
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
                  <td className="px-6 py-5 font-semibold">{p.stock_actual.toLocaleString('es-CL')}</td>
                  <td className="px-6 py-5 text-on-surface-variant">{p.stock_minimo}</td>
                  <td className="px-6 py-5"><span className={`font-bold text-sm ${estadoColor(p)}`}>{estadoLabel(p)}</span></td>
                  <td className="px-6 py-5 text-right">
                    <button onClick={() => navigate(`/add-product?edit=${p.id}`)} className="p-2 hover:bg-zinc-100 rounded-lg">
                      <span className="material-symbols-outlined text-zinc-500">edit</span>
                    </button>
                    <button onClick={() => handleEliminar(p.id)} className="p-2 hover:bg-zinc-100 rounded-lg">
                      <span className="material-symbols-outlined text-zinc-500">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  )
}
