import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import toast from 'react-hot-toast'

const FORM_INIT = {
  codigo_barras: '', sku: '', nombre: '', descripcion: '',
  categoria_id: '', stock_minimo: 10, unidad_medida: 'unidad',
  tiene_vencimiento: true, numero_lote: '', fecha_vencimiento: '', cantidad_inicial: '',
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
      // Las categorías las traemos directo desde la BD via backend
      const { data } = await api.get('/api/productos') // usa los datos del producto para inferir categorías
      // Alternativa simple: endpoint dedicado (ver nota abajo)
      const cats = [...new Map(data.filter(p => p.categoria_id).map(p => [p.categoria_id, { id: p.categoria_id, nombre: p.categoria_nombre }])).values()]
      setCategorias(cats)
    } catch {}
  }

  async function loadProducto(id) {
    setEditId(id)
    try {
      const { data } = await api.get(`/api/productos/${id}`)
      setForm(f => ({ ...f, ...data }))
    } catch { toast.error('Error al cargar producto') }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleBarcodeKeyDown = async (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (!form.codigo_barras) return
    try {
      const { data } = await api.get(`/api/productos/barcode/${form.codigo_barras}`)
      toast.success('Producto encontrado')
      setEditId(data.id)
      setForm(f => ({ ...f, ...data }))
    } catch {
      toast('Código no registrado. Completa el formulario para crear.', { icon: 'ℹ️' })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (editId) {
        await api.put(`/api/productos/${editId}`, form)
        toast.success('Producto actualizado')
      } else {
        await api.post('/api/productos', form)
        toast.success('Producto creado')
      }
      navigate('/products')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageLayout title={editId ? 'Editar Producto' : 'Ingresar Nuevo Producto'}>
      <div className="max-w-3xl mx-auto py-4">
        <section className="bg-surface-container-low p-8 rounded-xl flex flex-col items-center gap-4 text-center mb-8">
          <div className="w-14 h-14 bg-primary-fixed flex items-center justify-center rounded-full text-primary">
            <span className="material-symbols-outlined text-4xl">barcode_scanner</span>
          </div>
          <div className="w-full max-w-sm">
            <h2 className="font-semibold text-lg mb-1">Escanear Código de Barras</h2>
            <p className="text-xs text-on-surface-variant mb-3">El lector USB llena este campo automáticamente. Presiona Enter para buscar.</p>
            <input
              ref={barcodeRef}
              value={form.codigo_barras}
              onChange={e => set('codigo_barras', e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              className="w-full bg-surface-container-lowest border-2 border-primary rounded-lg text-center font-mono text-lg py-3 outline-none"
              placeholder="Esperando escaneo..."
            />
          </div>
        </section>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-zinc-100 space-y-8">
          <h3 className="font-bold text-xl border-b pb-4">Información General</h3>
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
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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

          {!editId && (
            <>
              <h3 className="font-bold text-xl border-b pb-4 pt-4">Lote Inicial</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">Número de Lote</label>
                  <input value={form.numero_lote} onChange={e => set('numero_lote', e.target.value)}
                    className="w-full h-14 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary font-mono"
                    placeholder="LOT-240101-A" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">Fecha de Vencimiento</label>
                  <input type="date" value={form.fecha_vencimiento} onChange={e => set('fecha_vencimiento', e.target.value)}
                    className="w-full h-14 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">Cantidad Inicial</label>
                  <input type="number" min="1" value={form.cantidad_inicial} onChange={e => set('cantidad_inicial', e.target.value)}
                    className="w-full h-14 px-4 bg-surface-container-high rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0" />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={() => navigate('/products')} className="px-8 py-3 font-bold text-primary">Cancelar</button>
            <button type="submit" disabled={loading}
              className="px-10 py-3 bg-primary text-on-primary font-bold rounded-lg shadow-lg hover:opacity-90 disabled:opacity-60 transition-all">
              {loading ? 'Guardando...' : editId ? 'Actualizar Producto' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  )
}
