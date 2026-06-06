import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import PrintLabelModal from '../components/PrintLabelModal'

const FORM_INIT = {
  numero_lote:       '',
  fecha_vencimiento: '',
  cantidad:          '',
  observacion:       '',
}

export default function RegisterEntryPage() {
  const [busqueda,    setBusqueda]    = useState('')
  const [producto,    setProducto]    = useState(null)
  const [lotes,       setLotes]       = useState([])
  const [form,        setForm]        = useState(FORM_INIT)
  const [loading,     setLoading]     = useState(false)
  const [printModal,  setPrintModal]  = useState(null) // { producto, lote }
  const barcodeRef = useRef(null)
  const navigate   = useNavigate()
  const { user }   = useAuth()

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  async function buscarProducto(query) {
    if (!query.trim()) return
    try {
      const { data } = await api.get(`/api/productos/barcode/${encodeURIComponent(query)}`)
      setProducto(data)
      // Cargar lotes existentes del producto para mostrar historial
      const movsRes = await api.get(`/api/movimientos?producto_id=${data.id}&limit=100`)
      // Extraer lotes únicos de los movimientos de entrada
      const lotesMap = {}
      movsRes.data
        .filter(m => m.tipo === 'ENTRADA' && m.numero_lote)
        .forEach(m => { lotesMap[m.numero_lote] = m })
      setLotes(Object.values(lotesMap))
      toast.success(`Producto encontrado: ${data.nombre}`)
    } catch {
      toast.error('Producto no encontrado. Verifica el SKU o código.')
      setProducto(null)
      setLotes([])
    }
  }

  const handleBarcodeEnter = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); buscarProducto(busqueda) }
  }

  async function handleRegistrar(e) {
    e.preventDefault()
    if (!producto)            { toast.error('Busca un producto primero'); return }
    if (!form.numero_lote)    { toast.error('El número de lote es requerido'); return }
    if (!form.cantidad || Number(form.cantidad) <= 0) { toast.error('Ingresa una cantidad válida'); return }
    if (producto.tiene_vencimiento && !form.fecha_vencimiento) {
      toast.error('Este producto requiere fecha de vencimiento'); return
    }

    setLoading(true)
    try {
      await api.post('/api/movimientos/entrada', {
        producto_id:      producto.id,
        numero_lote:      form.numero_lote,
        fecha_vencimiento: form.fecha_vencimiento || null,
        cantidad:         Number(form.cantidad),
        observacion:      form.observacion || null,
      })
      toast.success(`Lote ${form.numero_lote} registrado — +${form.cantidad} unidades`)
      // Mostrar modal de impresión antes de navegar
      setPrintModal({
        producto,
        lote: {
          numero_lote:       form.numero_lote,
          fecha_vencimiento: form.fecha_vencimiento || null,
          cantidad:          Number(form.cantidad),
        },
      })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar entrada')
    } finally {
      setLoading(false)
    }
  }

  const nuevoStock = () => {
    if (!producto || !form.cantidad) return producto?.stock_actual ?? 0
    return producto.stock_actual + Number(form.cantidad)
  }

  const handlePrintClose = () => {
    const prod = printModal?.producto
    setPrintModal(null)
    if (prod) navigate(`/products/${prod.id}/history`)
  }

  return (
    <PageLayout title="Registrar Entrada de Stock">
      {printModal && (
        <PrintLabelModal
          producto={printModal.producto}
          lote={printModal.lote}
          onClose={handlePrintClose}
        />
      )}
      <div className="max-w-7xl mx-auto flex gap-8">

        {/* Columna principal */}
        <div className="flex-grow flex flex-col gap-6">

          {/* Scanner */}
          <section className="bg-white rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-secondary/10 flex items-center justify-center rounded-lg border-2 border-dashed border-secondary">
                <span className="material-symbols-outlined text-secondary text-3xl">barcode_scanner</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Buscar Producto Existente</h2>
                <p className="text-sm text-zinc-500">Escanea o escribe el SKU y presiona Enter.</p>
              </div>
            </div>
            <input
              ref={barcodeRef}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={handleBarcodeEnter}
              className="pl-4 pr-4 py-2 bg-zinc-100 rounded-lg w-64 outline-none focus:ring-2 focus:ring-secondary font-mono"
              placeholder="SKU o código de barras..."
              autoFocus
            />
          </section>

          {/* Producto encontrado */}
          {producto ? (
            <section className="bg-white rounded-xl p-8 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2 py-1 text-[10px] font-bold rounded uppercase bg-secondary-container text-on-secondary-container">
                    Producto encontrado
                  </span>
                  <h3 className="text-3xl font-black mt-2">{producto.nombre}</h3>
                  <p className="text-on-surface-variant">SKU: <span className="font-mono">{producto.sku}</span></p>
                  {producto.codigo_barras && (
                    <p className="text-on-surface-variant text-sm">Barcode: <span className="font-mono">{producto.codigo_barras}</span></p>
                  )}
                  <p className="text-xs text-on-surface-variant mt-2">
                    Categoría: {producto.categoria_nombre || '—'} · Unidad: {producto.unidad_medida}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-primary">{producto.stock_actual}</p>
                  <p className="text-xs font-bold uppercase text-zinc-400">stock actual</p>
                  <p className="text-xs text-zinc-400 mt-1">mín. {producto.stock_minimo}</p>
                </div>
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-xl p-12 shadow-sm text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl mb-3 block opacity-30">inventory_2</span>
              <p className="font-medium">Busca un producto para registrar la entrada</p>
              <p className="text-sm mt-1 opacity-70">Si el producto aún no existe, créalo primero en "Nuevo Producto"</p>
            </section>
          )}

          {/* Formulario de lote */}
          {producto && (
            <form onSubmit={handleRegistrar} className="bg-white rounded-xl p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="text-xl font-bold">Datos del Lote</h3>
                <span className="text-xs text-on-surface-variant bg-zinc-100 px-3 py-1 rounded-full">
                  Cada cargamento = un lote independiente
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">
                    Número de Lote *
                  </label>
                  <input
                    required
                    value={form.numero_lote}
                    onChange={e => set('numero_lote', e.target.value)}
                    className="w-full h-14 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-secondary font-mono"
                    placeholder="LOT-250101-A"
                  />
                  <p className="text-xs text-on-surface-variant mt-1">
                    Si el número de lote ya existe, se sumará la cantidad al lote existente.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">
                    Fecha de Vencimiento {producto.tiene_vencimiento ? '*' : '(opcional)'}
                  </label>
                  <input
                    type="date"
                    required={producto.tiene_vencimiento}
                    value={form.fecha_vencimiento}
                    onChange={e => set('fecha_vencimiento', e.target.value)}
                    className="w-full h-14 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">
                    Cantidad a Ingresar *
                  </label>
                  <input
                    type="number" min="1" required
                    value={form.cantidad}
                    onChange={e => set('cantidad', e.target.value)}
                    className="w-full h-14 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-secondary font-bold text-lg"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">
                    Observación (opcional)
                  </label>
                  <input
                    value={form.observacion}
                    onChange={e => set('observacion', e.target.value)}
                    className="w-full h-14 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-secondary"
                    placeholder="Ej: Proveedor XYZ, OC-2026-001"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-2">
                <button type="button" onClick={() => { setProducto(null); setBusqueda(''); setForm(FORM_INIT) }}
                  className="px-8 py-3 font-bold text-secondary">
                  Limpiar
                </button>
                <button type="submit" disabled={loading}
                  className="px-10 py-3 bg-secondary text-on-secondary font-bold rounded-lg shadow-lg hover:opacity-90 disabled:opacity-60 transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  {loading ? 'Registrando...' : 'Registrar Entrada'}
                </button>
              </div>
            </form>
          )}

          {/* Historial de lotes del producto */}
          {producto && lotes.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-zinc-100">
              <div className="p-5 border-b">
                <h3 className="font-bold">Lotes anteriores de este producto</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Referencia para no duplicar números de lote</p>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 border-b text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Nº Lote</th>
                    <th className="px-6 py-4">Fecha Vencimiento</th>
                    <th className="px-6 py-4">Fecha Entrada</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lotes.map(l => (
                    <tr key={l.numero_lote} className="hover:bg-zinc-50">
                      <td className="px-6 py-4 font-mono font-bold">{l.numero_lote}</td>
                      <td className="px-6 py-4">
                        {l.fecha_vencimiento
                          ? format(new Date(l.fecha_vencimiento), 'dd MMM yyyy', { locale: es })
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {format(new Date(l.created_at), 'dd MMM yyyy', { locale: es })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Panel lateral de impacto */}
        <div className="w-[280px] shrink-0">
          <section className="bg-zinc-900 text-white rounded-2xl p-6 shadow-xl sticky top-24">
            <h3 className="text-base font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary-fixed">analytics</span>
              Impacto en Stock
            </h3>
            <div className="space-y-5">
              <div className="flex justify-between border-b border-white/10 pb-3">
                <span className="text-zinc-400 text-sm">Stock Actual</span>
                <span className="font-bold">{producto?.stock_actual ?? '—'}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-3 text-secondary-fixed">
                <span className="text-sm">Entrada</span>
                <span className="font-bold">+{form.cantidad || 0}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-zinc-400 text-sm">Nuevo Stock</span>
                <span className="text-2xl font-black text-secondary-fixed">
                  {producto ? nuevoStock() : '—'}
                </span>
              </div>
              {form.numero_lote && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-zinc-400 mb-1">Lote</p>
                  <p className="font-mono font-bold text-sm">{form.numero_lote}</p>
                </div>
              )}
              {form.fecha_vencimiento && (
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Vencimiento</p>
                  <p className="font-bold text-sm">
                    {format(new Date(form.fecha_vencimiento), 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

      </div>
    </PageLayout>
  )
}
