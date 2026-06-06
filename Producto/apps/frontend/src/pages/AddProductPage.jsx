import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import { formatCLP } from '../services/precio'
import toast from 'react-hot-toast'

const FORM_INIT = {
  codigo_barras: '', sku: '', nombre: '', descripcion: '',
  categoria_id: '', stock_minimo: 10, unidad_medida: 'unidad',
  tiene_vencimiento: true, precio_unitario: '', precio_descuento: '',
}

// Normaliza input de precio: elimina todo lo que no sea dígito
function normalizarPrecio(val) {
  return val.replace(/[^0-9]/g, '')
}

export default function AddProductPage() {
  const [form,       setForm]       = useState(FORM_INIT)
  const [categorias, setCategorias] = useState([])
  const [loading,    setLoading]    = useState(false)
  const [editId,     setEditId]     = useState(null)
  const barcodeRef = useRef(null)
  const navigate   = useNavigate()
  const [params]   = useSearchParams()

  useEffect(() => {
    fetchCategorias()
    const id = params.get('edit')
    if (id) loadProducto(id)
    barcodeRef.current?.focus()
  }, [])

  async function fetchCategorias() {
    try {
      const { data } = await api.get('/api/productos/categorias')
      setCategorias(data)
    } catch { toast.error('Error al cargar categorías') }
  }

  async function loadProducto(id) {
    setEditId(id)
    try {
      const { data } = await api.get(`/api/productos/${id}`)
      setForm(f => ({
        ...f, ...data,
        precio_unitario:  data.precio_unitario  ? String(Math.round(data.precio_unitario))  : '',
        precio_descuento: data.precio_descuento ? String(Math.round(data.precio_descuento)) : '',
      }))
    } catch { toast.error('Error al cargar producto') }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const setPrecio = (key, val) => {
    set(key, normalizarPrecio(val))
  }

  const handleBarcodeKeyDown = async (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (!form.codigo_barras) return
    try {
      const { data } = await api.get(`/api/productos/barcode/${form.codigo_barras}`)
      toast.success('Producto encontrado')
      setEditId(data.id)
      setForm(f => ({
        ...f, ...data,
        precio_unitario:  data.precio_unitario  ? String(Math.round(data.precio_unitario))  : '',
        precio_descuento: data.precio_descuento ? String(Math.round(data.precio_descuento)) : '',
      }))
    } catch {
      toast('Código no registrado. Completa el formulario.', { icon: 'ℹ️' })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        precio_unitario:  form.precio_unitario  ? Number(form.precio_unitario)  : 0,
        precio_descuento: form.precio_descuento ? Number(form.precio_descuento) : null,
      }
      if (editId) {
        await api.put(`/api/productos/${editId}`, payload)
        toast.success('Producto actualizado')
      } else {
        await api.post('/api/productos', payload)
        toast.success('Producto creado')
      }
      navigate('/products')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally { setLoading(false) }
  }

  const precioVigentePreview = form.precio_descuento
    ? Number(form.precio_descuento)
    : Number(form.precio_unitario) || 0

  return (
    <PageLayout title={editId ? 'Editar Producto' : 'Nuevo Producto'}>
      <div className="max-w-3xl mx-auto py-4">

        {/* Scanner */}
        <section className="bg-surface-container-low p-8 rounded-xl flex flex-col items-center gap-4 text-center mb-8">
          <div className="w-14 h-14 bg-primary-fixed flex items-center justify-center rounded-full text-primary">
            <span className="material-symbols-outlined text-4xl">barcode_scanner</span>
          </div>
          <div className="w-full max-w-sm">
            <h2 className="font-semibold text-lg mb-1">Escanear Código de Barras</h2>
            <p className="text-xs text-on-surface-variant mb-3">Si el producto ya existe se cargará para editar.</p>
            <input ref={barcodeRef} value={form.codigo_barras}
              onChange={e => set('codigo_barras', e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              className="w-full bg-surface-container-lowest border-2 border-primary rounded-lg text-center font-mono text-lg py-3 outline-none"
              placeholder="Esperando escaneo..." />
          </div>
        </section>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-zinc-100 space-y-8">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="font-bold text-xl">Información del Producto</h3>
            {!editId && (
              <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-semibold">
                Para agregar stock usa "Registrar Entrada"
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-full">
              <label className="block text-sm font-semibold text-on-surface-variant mb-2">Nombre del Producto *</label>
              <input required value={form.nombre} onChange={e => set('nombre', e.target.value)}
                className="w-full h-14 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ej: Catéter Intravenoso 18G" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface-variant mb-2">SKU *</label>
              <input required value={form.sku} onChange={e => set('sku', e.target.value)}
                className="w-full h-14 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary font-mono"
                placeholder="MED-CAT-18G-001" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface-variant mb-2">Categoría</label>
              <select value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}
                className="w-full h-14 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary">
                <option value="">Seleccionar...</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface-variant mb-2">Unidad de Medida</label>
              <input value={form.unidad_medida} onChange={e => set('unidad_medida', e.target.value)}
                className="w-full h-14 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary"
                placeholder="unidad, caja, vial..." />
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface-variant mb-2">Stock Mínimo</label>
              <input type="number" min="0" value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)}
                className="w-full h-14 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary" />
            </div>

            {/* Precios */}
            <div className="col-span-full">
              <div className="h-px bg-zinc-100 my-2" />
              <h4 className="font-bold text-base mb-4 text-on-surface-variant">Precios</h4>
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface-variant mb-2">Precio Normal (CLP)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">$</span>
                <input
                  inputMode="numeric"
                  value={form.precio_unitario}
                  onChange={e => setPrecio('precio_unitario', e.target.value)}
                  className="w-full h-14 pl-8 pr-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0" />
              </div>
              <p className="text-xs text-on-surface-variant mt-1">Solo números enteros, sin puntos ni comas</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-on-surface-variant mb-2">
                Precio con Descuento (CLP)
                <span className="ml-2 text-[10px] bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded-full font-bold">OPCIONAL</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">$</span>
                <input
                  inputMode="numeric"
                  value={form.precio_descuento}
                  onChange={e => setPrecio('precio_descuento', e.target.value)}
                  className={`w-full h-14 pl-8 pr-4 rounded-lg outline-none focus:ring-2 ${form.precio_descuento ? 'bg-tertiary-fixed focus:ring-tertiary border-2 border-tertiary' : 'bg-surface-container-high focus:ring-primary'}`}
                  placeholder="Solo si tiene precio rebajado" />
              </div>
              <p className="text-xs text-on-surface-variant mt-1">Solo números enteros, sin puntos ni comas</p>
            </div>

            {/* Preview precio vigente */}
            {(form.precio_unitario || form.precio_descuento) && (
              <div className="col-span-full">
                <div className={`p-4 rounded-xl flex items-center justify-between ${form.precio_descuento ? 'bg-tertiary-fixed' : 'bg-primary/5'}`}>
                  <div>
                    <p className="text-xs font-bold uppercase text-on-surface-variant">Precio que se usará en ventas</p>
                    {form.precio_descuento && form.precio_unitario && (
                      <p className="text-xs text-on-surface-variant mt-0.5 line-through">{formatCLP(form.precio_unitario)}</p>
                    )}
                  </div>
                  <p className={`text-2xl font-black ${form.precio_descuento ? 'text-tertiary' : 'text-primary'}`}>
                    {formatCLP(precioVigentePreview)}
                  </p>
                </div>
              </div>
            )}

            <div className="col-span-full">
              <label className="block text-sm font-semibold text-on-surface-variant mb-2">Descripción</label>
              <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3}
                className="w-full px-4 py-3 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Descripción del producto..." />
            </div>

            <div className="col-span-full flex items-center gap-3">
              <input type="checkbox" id="tiene_venc" checked={form.tiene_vencimiento}
                onChange={e => set('tiene_vencimiento', e.target.checked)} className="w-5 h-5 accent-primary" />
              <label htmlFor="tiene_venc" className="text-sm font-semibold text-on-surface-variant">
                Este producto tiene fecha de vencimiento
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={() => navigate('/products')} className="px-8 py-3 font-bold text-primary">Cancelar</button>
            <button type="submit" disabled={loading}
              className="px-10 py-3 bg-primary text-on-primary font-bold rounded-lg shadow-lg hover:opacity-90 disabled:opacity-60 transition-all">
              {loading ? 'Guardando...' : editId ? 'Actualizar Producto' : 'Crear Producto'}
            </button>
          </div>
        </form>

        {!editId && (
          <div className="mt-6 p-5 bg-secondary-fixed rounded-xl flex items-center justify-between">
            <div>
              <p className="font-bold text-on-secondary-fixed-variant">¿Ya tienes el producto creado?</p>
              <p className="text-sm text-on-secondary-fixed-variant/70">Usa "Registrar Entrada" para agregar stock con número de lote.</p>
            </div>
            <button onClick={() => navigate('/register-entry')}
              className="px-6 py-3 bg-secondary text-on-secondary font-bold rounded-lg hover:opacity-90 transition-all whitespace-nowrap">
              Registrar Entrada →
            </button>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
