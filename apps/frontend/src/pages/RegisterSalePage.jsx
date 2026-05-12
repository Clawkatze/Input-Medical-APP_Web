import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { formatCLP, calcularTotal } from '../services/precio'
import toast from 'react-hot-toast'

const MOTIVOS = ['VENTA', 'TRASLADO', 'MERMA', 'AJUSTE']

export default function RegisterSalePage() {
  const [busqueda,            setBusqueda]            = useState('')
  const [producto,            setProducto]            = useState(null)
  const [cantidad,            setCantidad]            = useState('')
  const [motivo,              setMotivo]              = useState('VENTA')
  const [precioUnitario,      setPrecioUnitario]      = useState('')
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState('')
  const [descuentoMonto,      setDescuentoMonto]      = useState('')
  const [loading,             setLoading]             = useState(false)
  const barcodeRef = useRef(null)
  const navigate   = useNavigate()
  const { user }   = useAuth()

  async function buscarProducto(query) {
    if (!query.trim()) return
    try {
      const { data } = await api.get(`/api/productos/barcode/${encodeURIComponent(query)}`)
      setProducto(data)
      // Pre-cargar el precio del producto
      setPrecioUnitario(data.precio_unitario || '')
      setDescuentoPorcentaje('')
      setDescuentoMonto('')
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

  // Calcular resumen económico en tiempo real
  const resumen = calcularTotal({
    precio_unitario:      precioUnitario,
    cantidad,
    descuento_porcentaje: descuentoPorcentaje,
    descuento_monto:      descuentoMonto,
  })

  const nuevoStock = () => {
    if (!producto || !cantidad) return producto?.stock_actual ?? 0
    return Math.max(0, producto.stock_actual - Number(cantidad))
  }

  async function handleRegistrar() {
    if (!producto)                              { toast.error('Selecciona un producto'); return }
    if (!cantidad || Number(cantidad) <= 0)     { toast.error('Ingresa una cantidad válida'); return }
    if (Number(cantidad) > producto.stock_actual) { toast.error('Stock insuficiente'); return }

    setLoading(true)
    try {
      await api.post('/api/movimientos/salida', {
        producto_id:          producto.id,
        cantidad:             Number(cantidad),
        motivo,
        precio_unitario:      Number(precioUnitario)      || 0,
        descuento_porcentaje: Number(descuentoPorcentaje) || 0,
        descuento_monto:      Number(descuentoMonto)      || 0,
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
                  <p className="text-on-surface-variant">SKU: <span className="font-mono">{producto.sku}</span></p>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Precio base: <span className="font-bold text-primary">{formatCLP(producto.precio_unitario)}</span>
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

          {/* Formulario de salida */}
          {producto && (
            <section className="bg-white rounded-xl p-8 shadow-sm space-y-6">
              <h3 className="text-xl font-bold border-b pb-4">Detalles de la Salida</h3>

              <div className="grid grid-cols-2 gap-6">
                {/* Cantidad */}
                <div>
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-2 block">Cantidad *</label>
                  <input type="number" min="1" max={producto.stock_actual}
                    value={cantidad} onChange={e => setCantidad(e.target.value)}
                    className="w-full bg-zinc-100 rounded-lg p-3 font-bold text-lg outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0" />
                </div>

                {/* Precio unitario (editable por venta) */}
                <div>
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-2 block">
                    Precio Unitario (CLP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">$</span>
                    <input type="number" min="0"
                      value={precioUnitario}
                      onChange={e => setPrecioUnitario(e.target.value)}
                      className="w-full bg-zinc-100 rounded-lg pl-7 pr-3 py-3 font-bold text-lg outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0" />
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-1">Pre-cargado desde el producto, editable por venta</p>
                </div>

                {/* Descuento % */}
                <div>
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-2 block">
                    Descuento (%)
                  </label>
                  <div className="relative">
                    <input type="number" min="0" max="100" step="0.1"
                      value={descuentoPorcentaje}
                      onChange={e => { setDescuentoPorcentaje(e.target.value); setDescuentoMonto('') }}
                      className="w-full bg-zinc-100 rounded-lg px-3 pr-8 py-3 font-bold text-lg outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">%</span>
                  </div>
                </div>

                {/* Descuento monto fijo */}
                <div>
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-2 block">
                    Descuento ($ monto fijo)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">$</span>
                    <input type="number" min="0"
                      value={descuentoMonto}
                      onChange={e => { setDescuentoMonto(e.target.value); setDescuentoPorcentaje('') }}
                      className="w-full bg-zinc-100 rounded-lg pl-7 pr-3 py-3 font-bold text-lg outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0" />
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-1">Se aplica el mayor entre % y $ fijo</p>
                </div>

                {/* Motivo */}
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
              </div>

              {/* Resumen económico inline */}
              {cantidad && precioUnitario && (
                <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-200">
                  <h4 className="font-bold text-sm mb-3 text-on-surface-variant uppercase tracking-wide">Resumen de la Venta</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-on-surface-variant mb-1">Subtotal</p>
                      <p className="font-bold text-lg">{formatCLP(resumen.subtotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant mb-1">Descuento</p>
                      <p className="font-bold text-lg text-error">-{formatCLP(resumen.descuento)}</p>
                    </div>
                    <div className="bg-primary/5 rounded-lg py-2">
                      <p className="text-xs text-on-surface-variant mb-1">Total</p>
                      <p className="font-black text-2xl text-primary">{formatCLP(resumen.total)}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Panel lateral */}
        <div className="w-[300px] shrink-0">
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

              {/* Resumen económico en panel */}
              {cantidad && precioUnitario && (
                <>
                  <div className="flex justify-between border-b border-white/10 pb-3">
                    <span className="text-zinc-400 text-sm">Subtotal</span>
                    <span className="font-bold">{formatCLP(resumen.subtotal)}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-3">
                    <span className="text-zinc-400 text-sm">Descuento</span>
                    <span className="font-bold text-error">-{formatCLP(resumen.descuento)}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-zinc-300 font-bold">TOTAL</span>
                    <span className="text-2xl font-black text-secondary-fixed">{formatCLP(resumen.total)}</span>
                  </div>
                </>
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
