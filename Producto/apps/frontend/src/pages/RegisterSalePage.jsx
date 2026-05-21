import { useRef, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import { formatCLP, precioVigente, tieneDescuento } from '../services/precio'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const MOTIVOS = ['VENTA', 'TRASLADO', 'MERMA', 'AJUSTE']

export default function RegisterSalePage() {
  const [busqueda, setBusqueda] = useState('')
  const [producto, setProducto] = useState(null)
  const [lotes,    setLotes]    = useState([])
  const [loteSeleccionado, setLoteSeleccionado] = useState(null)
  const [cantidad, setCantidad] = useState('')
  const [motivo,   setMotivo]   = useState('VENTA')
  const [loading,  setLoading]  = useState(false)
  const barcodeRef = useRef(null)
  const navigate   = useNavigate()
  const [params]   = useSearchParams()

  // Si viene desde Alertas con producto_id y lote_id precargados
  useEffect(() => {
    const producto_id = params.get('producto_id')
    const lote_id     = params.get('lote_id')
    const motivo_param = params.get('motivo')

    if (producto_id) {
      cargarProductoPorId(producto_id, lote_id, motivo_param)
    }
  }, [])

  async function cargarProductoPorId(id, lote_id, motivo_param) {
    try {
      const { data } = await api.get(`/api/productos/${id}`)
      setProducto(data)
      if (motivo_param) setMotivo(motivo_param)
      await cargarLotes(id, lote_id)
    } catch { toast.error('Error al cargar producto') }
  }

  async function cargarLotes(producto_id, lote_id_preseleccionado) {
    try {
      const { data } = await api.get(`/api/movimientos/lotes/${producto_id}`)
      setLotes(data)
      if (lote_id_preseleccionado) {
        const lote = data.find(l => l.id === lote_id_preseleccionado)
        if (lote) setLoteSeleccionado(lote)
      }
    } catch {}
  }

  async function buscarProducto(query) {
    if (!query.trim()) return
    try {
      const { data } = await api.get(`/api/productos/barcode/${encodeURIComponent(query)}`)
      setProducto(data)
      setCantidad('')
      setLoteSeleccionado(null)
      await cargarLotes(data.id, null)
      toast.success(`Producto encontrado: ${data.nombre}`)
    } catch {
      toast.error('Producto no encontrado')
      setProducto(null)
      setLotes([])
    }
  }

  const handleBarcodeEnter = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); buscarProducto(busqueda) }
  }

  const esMerma   = motivo === 'MERMA'
  const precio    = precioVigente(producto)
  const conDesc   = tieneDescuento(producto)
  const subtotal  = precio * (Number(cantidad) || 0)
  const nuevoStock = () => !producto || !cantidad ? (producto?.stock_actual ?? 0) : Math.max(0, producto.stock_actual - Number(cantidad))

  async function handleRegistrar() {
    if (!producto)                               { toast.error('Selecciona un producto'); return }
    if (!cantidad || Number(cantidad) <= 0)       { toast.error('Ingresa una cantidad válida'); return }
    if (Number(cantidad) > producto.stock_actual) { toast.error('Stock insuficiente'); return }

    // Merma requiere lote específico
    if (esMerma && !loteSeleccionado) {
      toast.error('Para MERMA debes seleccionar el lote afectado')
      return
    }
    if (esMerma && Number(cantidad) > loteSeleccionado.cantidad_actual) {
      toast.error(`Stock insuficiente en el lote. Disponible: ${loteSeleccionado.cantidad_actual}`)
      return
    }

    setLoading(true)
    try {
      if (esMerma) {
        // Endpoint específico de merma con lote seleccionado
        await api.post('/api/movimientos/merma', {
          producto_id: producto.id,
          lote_id:     loteSeleccionado.id,
          cantidad:    Number(cantidad),
          observacion: `Merma lote ${loteSeleccionado.numero_lote}`,
        })
      } else {
        // Salida normal con FIFO automático
        await api.post('/api/movimientos/salida', {
          producto_id: producto.id,
          cantidad:    Number(cantidad),
          motivo,
        })
      }
      toast.success('Movimiento registrado correctamente')
      navigate(`/products/${producto.id}/history`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar')
    } finally { setLoading(false) }
  }

  return (
    <PageLayout title="Registrar Salida de Producto">
      <div className="max-w-7xl mx-auto flex gap-8">
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
                  <div className="mt-3 flex items-center gap-3">
                    {conDesc && <span className="line-through text-zinc-400 text-sm">{formatCLP(producto.precio_unitario)}</span>}
                    <span className={`text-2xl font-black ${conDesc ? 'text-tertiary' : 'text-primary'}`}>{formatCLP(precio)}</span>
                    {conDesc && <span className="px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-black rounded-full">Precio con descuento</span>}
                  </div>
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

              {/* Motivo */}
              <div>
                <label className="text-xs font-bold uppercase text-on-surface-variant mb-3 block">Motivo</label>
                <div className="flex gap-2">
                  {MOTIVOS.map(m => (
                    <button key={m} type="button" onClick={() => { setMotivo(m); setLoteSeleccionado(null) }}
                      className={`flex-grow py-3 font-bold rounded-lg border-2 text-sm transition-all ${
                        motivo === m
                          ? m === 'MERMA' ? 'bg-error/10 border-error text-error' : 'bg-primary/10 border-primary text-primary'
                          : 'bg-zinc-100 border-transparent text-zinc-500 hover:border-zinc-300'
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selección de lote — solo para MERMA */}
              {esMerma && (
                <div>
                  <label className="text-xs font-bold uppercase text-on-surface-variant mb-3 block flex items-center gap-2">
                    <span className="material-symbols-outlined text-error text-[16px]">warning</span>
                    Seleccionar Lote Afectado (requerido para MERMA)
                  </label>
                  {lotes.length === 0 ? (
                    <p className="text-sm text-on-surface-variant bg-zinc-50 p-4 rounded-lg">Sin lotes activos disponibles</p>
                  ) : (
                    <div className="space-y-2">
                      {lotes.map(l => (
                        <button key={l.id} type="button" onClick={() => setLoteSeleccionado(l)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            loteSeleccionado?.id === l.id
                              ? 'border-error bg-error/5'
                              : 'border-zinc-200 hover:border-zinc-400 bg-white'
                          }`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-mono font-bold">{l.numero_lote}</p>
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                {l.fecha_vencimiento
                                  ? `Vence: ${format(new Date(l.fecha_vencimiento), 'dd MMM yyyy', { locale: es })}`
                                  : 'Sin fecha de vencimiento'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-lg">{l.cantidad_actual}</p>
                              <p className="text-xs text-on-surface-variant">disponibles</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {!esMerma && (
                    <p className="text-xs text-on-surface-variant mt-2">
                      Para otros motivos el lote se selecciona automáticamente (FIFO)
                    </p>
                  )}
                </div>
              )}

              {!esMerma && (
                <p className="text-xs text-on-surface-variant bg-zinc-50 p-3 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-secondary">info</span>
                  El lote se selecciona automáticamente según FIFO (el que vence primero)
                </p>
              )}

              {/* Cantidad */}
              <div>
                <label className="text-xs font-bold uppercase text-on-surface-variant mb-2 block">Cantidad *</label>
                <input type="number" min="1"
                  max={esMerma && loteSeleccionado ? loteSeleccionado.cantidad_actual : producto.stock_actual}
                  value={cantidad} onChange={e => setCantidad(e.target.value)}
                  className="w-full bg-zinc-100 rounded-lg p-3 font-bold text-lg outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0" />
                {esMerma && loteSeleccionado && (
                  <p className="text-xs text-on-surface-variant mt-1">
                    Máximo disponible en lote: {loteSeleccionado.cantidad_actual}
                  </p>
                )}
              </div>

              {/* Resumen */}
              {cantidad && precio > 0 && (
                <div className="bg-zinc-50 rounded-xl p-5 border border-zinc-200">
                  <h4 className="font-bold text-sm mb-3 text-on-surface-variant uppercase tracking-wide">Resumen</h4>
                  <div className="flex items-center justify-between">
                    <div className="text-center"><p className="text-xs text-on-surface-variant mb-1">Precio vigente</p><p className="font-bold">{formatCLP(precio)}</p></div>
                    <span className="text-zinc-400 font-bold text-xl">×</span>
                    <div className="text-center"><p className="text-xs text-on-surface-variant mb-1">Cantidad</p><p className="font-bold">{cantidad}</p></div>
                    <span className="text-zinc-400 font-bold text-xl">=</span>
                    <div className="text-center bg-primary/5 rounded-lg px-6 py-3">
                      <p className="text-xs text-on-surface-variant mb-1">Total</p>
                      <p className="font-black text-2xl text-primary">{formatCLP(subtotal)}</p>
                    </div>
                  </div>
                </div>
              )}
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
              {esMerma && loteSeleccionado && (
                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-zinc-400 text-sm">Lote</span>
                  <span className="font-mono font-bold text-xs">{loteSeleccionado.numero_lote}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-white/10 pb-3 text-error">
                <span className="text-sm">{motivo}</span>
                <span className="font-bold">-{cantidad || 0}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-3">
                <span className="text-zinc-400 text-sm">Nuevo Stock</span>
                <span className="font-bold text-secondary-fixed">{producto ? nuevoStock() : '—'}</span>
              </div>
              {cantidad && precio > 0 && (
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-300 font-bold">TOTAL</span>
                  <span className={`text-2xl font-black ${conDesc ? 'text-yellow-300' : 'text-secondary-fixed'}`}>{formatCLP(subtotal)}</span>
                </div>
              )}
            </div>
            <button onClick={handleRegistrar} disabled={loading || !producto || (esMerma && !loteSeleccionado)}
              className={`w-full mt-8 py-4 font-bold rounded-xl shadow-lg hover:opacity-90 disabled:opacity-50 transition-all text-white ${esMerma ? 'bg-error' : 'bg-primary'}`}>
              {loading ? 'Registrando...' : esMerma ? 'Registrar Merma' : 'Registrar Salida'}
            </button>
            {esMerma && !loteSeleccionado && (
              <p className="text-center text-xs text-zinc-400 mt-2">Selecciona el lote afectado</p>
            )}
          </section>
        </div>
      </div>
    </PageLayout>
  )
}
