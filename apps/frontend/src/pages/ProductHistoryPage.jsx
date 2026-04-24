import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
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

  return (
    <PageLayout title="Historial de Movimientos">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate('/products')} className="flex items-center gap-2 text-primary font-bold mb-8">
          <span className="material-symbols-outlined">arrow_back</span> Volver a Productos
        </button>

        <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-black">{producto.nombre}</h2>
            <p className="text-on-surface-variant font-mono text-sm mt-1">SKU: {producto.sku}</p>
            {producto.codigo_barras && <p className="font-mono text-xs text-on-surface-variant mt-0.5">Barcode: {producto.codigo_barras}</p>}
          </div>
          <div className="bg-white p-5 rounded-xl border text-center shadow-sm">
            <p className="text-xs font-bold text-zinc-400">STOCK TOTAL</p>
            <p className="text-4xl font-black text-primary">{producto.stock_actual}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border">
          <div className="p-5 border-b">
            <h3 className="font-bold text-lg">Kardex de Movimientos</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-zinc-50 border-b">
              <tr className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                <th className="px-8 py-5">Fecha / Hora</th>
                <th className="px-8 py-5">Tipo</th>
                <th className="px-8 py-5">Lote</th>
                <th className="px-8 py-5">Cantidad</th>
                <th className="px-8 py-5">Motivo</th>
                <th className="px-8 py-5">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {movs.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-10 text-center text-on-surface-variant">Sin movimientos registrados</td></tr>
              ) : movs.map(m => (
                <tr key={m.id} className="hover:bg-zinc-50">
                  <td className="px-8 py-5 font-bold">
                    {format(new Date(m.created_at), 'dd MMM', { locale: es })}
                    <br /><span className="text-xs font-normal text-on-surface-variant">{format(new Date(m.created_at), 'HH:mm')}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded border font-black text-[10px] ${m.tipo === 'ENTRADA' ? 'bg-secondary-container text-on-secondary-container border-secondary/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="px-8 py-5 font-mono text-xs">{m.numero_lote || '—'}</td>
                  <td className={`px-8 py-5 text-lg font-black ${m.tipo === 'ENTRADA' ? 'text-secondary' : 'text-primary'}`}>
                    {m.tipo === 'ENTRADA' ? '+' : '-'}{m.cantidad}
                  </td>
                  <td className="px-8 py-5">{m.motivo || '—'}</td>
                  <td className="px-8 py-5 text-on-surface-variant text-xs">{m.usuario_email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  )
}
