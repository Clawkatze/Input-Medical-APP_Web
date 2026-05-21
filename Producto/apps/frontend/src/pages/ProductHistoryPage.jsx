import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import { formatCLP } from '../services/precio'
import toast from 'react-hot-toast'

export default function ProductHistoryPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [producto, setProducto] = useState(null)
  const [movs,     setMovs]     = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/api/productos/${id}`),
      api.get(`/api/movimientos?producto_id=${id}&limit=50`),
    ])
      .then(([prodRes, movsRes]) => {
        setProducto(prodRes.data)
        setMovs(movsRes.data)
      })
      .catch(() => toast.error('Error al cargar historial'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <PageLayout title="Historial"><p className="text-center py-20 text-on-surface-variant">Cargando...</p></PageLayout>
  if (!producto) return <PageLayout title="Historial"><p className="text-center py-20 text-error">Producto no encontrado</p></PageLayout>

  const getBadge = (m) => {
    if (m.tipo === 'ENTRADA')    return { label: 'ENTRADA',  cls: 'bg-secondary-container text-on-secondary-container' }
    if (m.motivo === 'MERMA')    return { label: 'MERMA',    cls: 'bg-error text-white' }
    if (m.motivo === 'TRASLADO') return { label: 'TRASLADO', cls: 'bg-zinc-200 text-zinc-700' }
    if (m.motivo === 'AJUSTE')   return { label: 'AJUSTE',   cls: 'bg-zinc-200 text-zinc-700' }
    return { label: 'VENTA', cls: 'bg-primary/10 text-primary' }
  }

  // Precio diferenciado: entrada = costo, salida = venta, merma = costo
  const getPrecioLabel = (m) => {
    if (!m.precio_unitario || m.precio_unitario <= 0) return null
    if (m.tipo === 'ENTRADA') return { valor: formatCLP(m.precio_unitario), sub: 'costo', color: 'text-secondary' }
    if (m.motivo === 'MERMA') return { valor: formatCLP(m.precio_unitario), sub: 'costo', color: 'text-error' }
    return { valor: formatCLP(m.precio_unitario), sub: 'venta', color: 'text-primary' }
  }

  const getTotalDisplay = (m) => {
    if (!m.total || m.total <= 0) return null
    if (m.motivo === 'MERMA')    return { valor: `-${formatCLP(m.total)}`, color: 'text-error font-black' }
    if (m.tipo === 'ENTRADA')    return { valor: formatCLP(m.total),        color: 'text-secondary font-bold' }
    return { valor: formatCLP(m.total), color: 'text-primary font-bold' }
  }

  return (
    <PageLayout title="Historial de Movimientos">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/products')} className="flex items-center gap-2 text-primary font-bold mb-8">
          <span className="material-symbols-outlined">arrow_back</span> Volver a Productos
        </button>

        {/* Encabezado */}
        <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-black">{producto.nombre}</h2>
            <p className="text-on-surface-variant font-mono text-sm mt-1">SKU: {producto.sku}</p>
            {producto.codigo_barras && (
              <p className="font-mono text-xs text-on-surface-variant mt-0.5">Barcode: {producto.codigo_barras}</p>
            )}
          </div>
          <div className="flex gap-4">
            <div className="bg-white p-5 rounded-xl border text-center shadow-sm min-w-[120px]">
              <p className="text-xs font-bold text-zinc-400">STOCK</p>
              <p className="text-4xl font-black text-primary">{producto.stock_actual}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border text-center shadow-sm min-w-[140px]">
              <p className="text-xs font-bold text-zinc-400">PRECIO BASE</p>
              <p className="text-2xl font-black text-secondary">{formatCLP(producto.precio_unitario)}</p>
              {producto.precio_descuento && (
                <p className="text-xs font-bold text-tertiary mt-1">V.DESC {formatCLP(producto.precio_descuento)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Leyenda de colores */}
        <div className="flex items-center gap-4 mb-4 text-xs text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-secondary inline-block"></span> Precio de costo (entradas/mermas)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-primary inline-block"></span> Precio de venta
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-error inline-block"></span> Pérdida (merma)
          </span>
        </div>

        {/* Kardex */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border">
          <div className="p-5 border-b">
            <h3 className="font-bold text-lg">Kardex de Movimientos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 border-b">
                <tr className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                  <th className="px-6 py-5">Fecha</th>
                  <th className="px-6 py-5">Tipo</th>
                  <th className="px-6 py-5">Lote</th>
                  <th className="px-6 py-5">Cantidad</th>
                  <th className="px-6 py-5">Precio Unit.</th>
                  <th className="px-6 py-5">Total</th>
                  <th className="px-6 py-5">Motivo</th>
                  <th className="px-6 py-5">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {movs.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-10 text-center text-on-surface-variant">Sin movimientos registrados</td></tr>
                ) : movs.map(m => {
                  const badge  = getBadge(m)
                  const precio = getPrecioLabel(m)
                  const total  = getTotalDisplay(m)
                  return (
                    <tr key={m.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-4 font-bold whitespace-nowrap">
                        {format(new Date(m.created_at), 'dd MMM', { locale: es })}
                        <br /><span className="text-xs font-normal text-on-surface-variant">{format(new Date(m.created_at), 'HH:mm')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-black ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{m.numero_lote || '—'}</td>
                      <td className={`px-6 py-4 text-lg font-black ${m.tipo === 'ENTRADA' ? 'text-secondary' : m.motivo === 'MERMA' ? 'text-error' : 'text-primary'}`}>
                        {m.tipo === 'ENTRADA' ? '+' : '-'}{m.cantidad}
                      </td>
                      <td className="px-6 py-4">
                        {precio ? (
                          <div>
                            <span className={`font-bold ${precio.color}`}>{precio.valor}</span>
                            <span className="text-[10px] text-zinc-400 ml-1">{precio.sub}</span>
                          </div>
                        ) : <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {total
                          ? <span className={total.color}>{total.valor}</span>
                          : <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">{m.motivo || '—'}</td>
                      <td className="px-6 py-4 text-on-surface-variant text-xs">{m.usuario_email || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
