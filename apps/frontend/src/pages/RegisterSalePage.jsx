import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import { formatCLP, precioVigente, tieneDescuento } from '../services/precio'
import toast from 'react-hot-toast'

const MOTIVOS = ['VENTA', 'TRASLADO', 'MERMA', 'AJUSTE']

export default function RegisterSalePage() {
  const [busqueda, setBusqueda] = useState('')
  const [producto, setProducto] = useState(null)
  const [cantidad, setCantidad] = useState('')
  const [motivo,   setMotivo]   = useState('VENTA')
  const [loading,  setLoading]  = useState(false)
  const barcodeRef = useRef(null)
  const navigate   = useNavigate()

  async function buscarProducto(query) {
    if (!query.trim()) return
    try {
      const { data } = await api.get(`/api/productos/barcode/${encodeURIComponent(query)}`)
      setProducto(data)
      setCantidad('')
      toast.success(`Producto encontrado: ${data.nombre}`)
    } catch {
      toast.error('Producto no encontrado')
      setProducto(null)
    }
  }

  const handleBarcodeEnter = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); buscarProducto(busqueda) }
  }

  const precio       = precioVigente(producto)
  const conDescuento = tieneDescuento(producto)
  const subtotal     = precio * (Number(cantidad) || 0)
  const nuevoStock   = () => !producto || !cantidad ? (producto?.stock_actual ?? 0) : Math.max(0, producto.stock_actual - Number(cantidad))

  async function handleRegistrar() {
    if (!producto)                                { toast.error('Selecciona un producto'); return }
    if (!cantidad || Number(cantidad) <= 0)        { toast.error('Ingresa una cantidad válida'); return }
    if (Number(cantidad) > producto.stock_actual)  { toast.error('Stock insuficiente'); return }

    setLoading(true)
    try {
      await api.post('/api/movimientos/salida', {
        producto_id: producto.id,
        cantidad:    Number(cantidad),
        motivo,
      })
      toast.success('Salida registrada correctamente')
      navigate(`/products/${producto.id}/history`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar')
    } finally { setLoading(false) }
  }

  return (
    <PageLayout title="Registrar Salida de Producto">
      <div className="max-w-7xl mx-auto flex gap-8">

        {/* Columna principal */}
        <div className="flex-grow flex flex-col gap-6">

          {/* Scanner */}
          <section className="bg-white rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-primary/10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary">
                <span className="material-symbols-outlined text-primary text-3xl">barcode_scanner</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Escanear Producto</h2>
                <p className="text-sm text-zinc-500">Ingresa el SKU o código y presiona Enter.</p>
              </div>
            </div>
            <input ref={barcodeRef} value={busqueda} autoFocus
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={handleBarcodeEnter}
              className="pl-4 pr-4 py-2 bg-zinc-100 rounded-lg w-64 outline-none focus:ring-2 focus:ring-primary font-mono"
              placeholder="SKU o código de barras..." />
          </section>

          {/* Info producto */}
          {producto ? (
            <section className="bg-white rounded-xl p-8 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${producto.stock_actual > 0 ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
                    {producto.stock_actual > 0 ? 'En Stock' : 'Sin Stock'}
                  </span>
                  <h3 className="text-3xl font-black mt-2">{producto.nombre}</h3>
                  <p className="text-on-surface-variant text-sm">SKU: <span className="font-mono">{producto.sku}</span></p>

                  {/* Precio vigente con indicador de descuento */}
                  <div className="mt-3 flex items-center gap-3">
                    {conDescuento && (
                      <span className="line-through text-zinc-400 text-sm">{formatCLP(producto.precio_unitario)}</span>
                    )}
                    <span className={`text-2xl font-black ${conDescuento ? 'text-tertiary' : 'text-primary'}`}>
                      {formatCLP(precio)}
                    </span>
                    {conDescuento && (
                      <span className="px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-black rounded-full uppercase">
                        Precio con descuento
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Este precio se registrará automáticamente en la salida
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-primary">{producto.stock_actual}</p>
                  <p className="text-xs font-bold uppercase text-zinc-400">disponibles</p>
                </div>
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-xl p-12 shadow-sm text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-3 block opacity-30">inventory_2</span>
              <p>Escanea o ingresa un SKU para buscar el producto</p>
            </section>
          )}

          {/* Formulario */}
          {producto && (
            <section className="bg-white rounded-xl p-8 shadow-sm space-y-6">
              <h3 className="text-xl font-bold border-b pb-4">Detalles de la Salida</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-2 block">Cantidad *</label>
                  <input type="number" min="1" max={producto.stock_actual}
                    value={cantidad} onChange={e => setCantidad(e.target.value)}
                    className="w-full bg-zinc-100 rounded-lg p-3 font-bold text-lg outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0" />
                </div>

                <div className="col-span-full">
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-3 block">Motivo</label>
                  <div className="flex gap-2">
                    {MOTIVOS.map(m => (
                      <button key={m} type="button" onClick={() => setMotivo(m)}
                        className={`flex-grow py-3 font-bold rounded-lg border-2 text-sm transition-all ${motivo === m ? 'bg-primary/10 border-primary text-primary' : 'bg-zinc-100 border-transparent text-zinc-500 hover:border-zinc-300'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resumen económico */}
                {cantidad && precio > 0 && (
                  <div className="col-span-full bg-zinc-50 rounded-xl p-5 border border-zinc-200">
                    <h4 className="font-bold text-sm mb-3 text-on-surface-variant uppercase tracking-wide">Resumen de la Venta</h4>
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-xs text-on-surface-variant mb-1">Precio unitario</p>
                        <p className="font-bold">{formatCLP(precio)}</p>
                      </div>
                      <span className="text-zinc-400 font-bold text-xl">×</span>
                      <div className="text-center">
                        <p className="text-xs text-on-surface-variant mb-1">Cantidad</p>
                        <p className="font-bold">{cantidad}</p>
                      </div>
                      <span className="text-zinc-400 font-bold text-xl">=</span>
                      <div className="text-center bg-primary/5 rounded-lg px-6 py-3">
                        <p className="text-xs text-on-surface-variant mb-1">Total</p>
                        <p className="font-black text-2xl text-primary">{formatCLP(subtotal)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Panel lateral */}
        <div className="w-[280px] shrink-0">
          <section className="bg-zinc-900 text-white rounded-2xl p-6 shadow-xl sticky top-24">
            <h3 className="text-base font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              Resumen
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-white/10 pb-3">
                <span className="text-zinc-400 text-sm">Stock Actual</span>
                <span className="font-bold">{producto?.stock_actual ?? '—'}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-3 text-error">
                <span className="text-sm">Salida</span>
                <span className="font-bold">-{cantidad || 0}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-3">
                <span className="text-zinc-400 text-sm">Nuevo Stock</span>
                <span className="font-bold text-secondary-fixed">{producto ? nuevoStock() : '—'}</span>
              </div>
              {cantidad && precio > 0 && (
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-300 font-bold">TOTAL</span>
                  <span className={`text-2xl font-black ${conDescuento ? 'text-yellow-300' : 'text-secondary-fixed'}`}>
                    {formatCLP(subtotal)}
                  </span>
                </div>
              )}
            </div>
            <button onClick={handleRegistrar} disabled={loading || !producto}
              className="w-full mt-8 py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:opacity-90 disabled:opacity-50 transition-all">
              {loading ? 'Registrando...' : 'Registrar Salida'}
            </button>
          </section>
        </div>
      </div>
    </PageLayout>
  )
}
