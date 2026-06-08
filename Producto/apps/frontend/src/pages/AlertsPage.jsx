import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

function colorFila(dias) {
  if (dias === null)  return 'border-l-4 border-zinc-200'
  if (dias < 0)       return 'bg-red-50 border-l-4 border-red-500'
  if (dias <= 30)     return 'bg-red-50 border-l-4 border-red-400'
  if (dias <= 60)     return 'bg-yellow-50 border-l-4 border-yellow-400'
  return               'bg-orange-50 border-l-4 border-orange-400'
}

function etiquetaDias(dias) {
  if (dias === null)  return { text: '—',                               cls: 'bg-zinc-100 text-zinc-500' }
  if (dias < 0)       return { text: `Vencido hace ${Math.abs(dias)}d`, cls: 'bg-red-100 text-red-700' }
  if (dias === 0)     return { text: 'Vence hoy',                       cls: 'bg-red-100 text-red-700' }
  if (dias <= 30)     return { text: `${dias}d`,                        cls: 'bg-red-100 text-red-700' }
  if (dias <= 60)     return { text: `${dias}d`,                        cls: 'bg-yellow-100 text-yellow-700' }
  return               { text: `${dias}d`,                              cls: 'bg-orange-100 text-orange-700' }
}

function parseDias(fecha) {
  if (!fecha) return null
  const str = fecha instanceof Date ? fecha.toISOString().split('T')[0] : String(fecha).split('T')[0]
  const d = new Date(str + 'T00:00:00')
  if (isNaN(d.getTime())) return null
  return Math.round((d - new Date()) / (1000 * 60 * 60 * 24))
}

export default function AlertsPage() {
  const [alertasStock, setAlertasStock] = useState([])
  const [alertasVenc,  setAlertasVenc]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [tab,          setTab]          = useState('todos')
  const [diasFiltro,   setDiasFiltro]   = useState(null)
  const { isBodeguero } = useAuth()
  const [searchParams]  = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const filtroUrl = searchParams.get('filtro')
    if (filtroUrl === 'vencimiento') setTab('vencimiento')
    else if (filtroUrl === 'stock')  setTab('stock')

    Promise.all([
      api.get('/api/movimientos/alertas'),
      api.get('/api/alertas/pendientes'),
    ])
      .then(([stockRes, vencRes]) => {
        setAlertasStock(stockRes.data.filter(a => a.alerta_stock))
        setAlertasVenc(vencRes.data)
      })
      .catch(() => toast.error('Error al cargar alertas'))
      .finally(() => setLoading(false))
  }, [])

  const vencFiltradas = alertasVenc.filter(item => {
    if (!diasFiltro) return true
    const dias = parseDias(item.fecha_vencimiento)
    return dias !== null && dias <= diasFiltro
  })

  // Para la pestaña "Todos" combinamos stock crítico + vencimientos filtrados
  // evitando duplicados por producto_id
  const todosCombinados = (() => {
    const vistos = new Set()
    const resultado = []

    alertasStock.forEach(item => {
      if (!vistos.has(item.id)) {
        vistos.add(item.id)
        resultado.push({ ...item, _tipo: 'stock' })
      }
    })

    vencFiltradas.forEach(item => {
      const key = item.lote_id || item.producto_id
      if (!vistos.has(key)) {
        vistos.add(key)
        resultado.push({ ...item, _tipo: 'vencimiento' })
      }
    })

    return resultado
  })()

  const totalTodos = alertasStock.length + alertasVenc.length

  return (
    <PageLayout title="Alertas del Sistema">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold mb-1">Monitor de Estado</h2>
          <p className="text-on-surface-variant">Revisión proactiva de stock y vencimientos.</p>
        </div>

        {/* Pestañas */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <button onClick={() => { setTab('todos'); setDiasFiltro(null) }}
            className={`px-4 py-2 rounded-lg font-bold text-sm border-2 transition-all ${
              tab === 'todos'
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-600'
            }`}>
            Todos ({totalTodos})
          </button>

          <button onClick={() => { setTab('stock'); setDiasFiltro(null) }}
            className={`px-4 py-2 rounded-lg font-bold text-sm border-2 transition-all ${
              tab === 'stock'
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-zinc-200 hover:border-zinc-300'
            }`}>
            <span className={tab !== 'stock' ? 'text-error' : ''}>
              Stock Crítico ({alertasStock.length})
            </span>
          </button>

          <button onClick={() => setTab('vencimiento')}
            className={`px-4 py-2 rounded-lg font-bold text-sm border-2 transition-all ${
              tab === 'vencimiento'
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-zinc-200 hover:border-zinc-300'
            }`}>
            <span className={tab !== 'vencimiento' ? 'text-amber-600' : ''}>
              Próximo a Vencer ({alertasVenc.length})
            </span>
          </button>
        </div>

        {/* Filtros días — en pestaña vencimiento y todos */}
        {(tab === 'vencimiento' || tab === 'todos') && (
          <div className="flex gap-2 mb-6 items-center flex-wrap">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Vence en:</span>
            {[
              { val: 30, label: '≤ 30 días', cls: 'border-red-300 text-red-600 bg-red-50' },
              { val: 60, label: '≤ 60 días', cls: 'border-yellow-300 text-yellow-700 bg-yellow-50' },
              { val: 90, label: '≤ 90 días', cls: 'border-orange-300 text-orange-600 bg-orange-50' },
            ].map(d => (
              <button key={d.val}
                onClick={() => setDiasFiltro(diasFiltro === d.val ? null : d.val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                  diasFiltro === d.val ? d.cls : 'border-zinc-200 text-zinc-500 bg-white hover:border-zinc-300'
                }`}>
                {d.label}
              </button>
            ))}
            {diasFiltro && (
              <button onClick={() => setDiasFiltro(null)} className="text-xs text-zinc-400 hover:text-zinc-600 ml-1">
                Quitar filtro ×
              </button>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-center py-12 text-on-surface-variant">Cargando alertas...</p>
        ) : (tab === 'todos' ? todosCombinados : tab === 'stock' ? alertasStock : vencFiltradas).length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
            <span className="material-symbols-outlined text-5xl text-secondary mb-4 block">check_circle</span>
            <h3 className="text-xl font-bold mb-2">Sin alertas activas</h3>
            <p className="text-on-surface-variant">
              {tab === 'stock'
                ? 'No hay productos con stock crítico.'
                : diasFiltro
                  ? `No hay alertas para los próximos ${diasFiltro} días.`
                  : 'No hay alertas activas en este momento.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Stock crítico */}
            {(tab === 'todos' ? alertasStock : tab === 'stock' ? alertasStock : []).map((item, idx) => (
              <div key={`stock-${item.id}-${idx}`}
                className="bg-white rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap shadow-sm border-l-4 border-error">
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-red-100 text-red-700 mb-1 inline-block">
                    STOCK CRÍTICO
                  </span>
                  <h3 className="text-lg font-bold">{item.nombre}</h3>
                  <p className="text-xs font-mono text-on-surface-variant">{item.sku}</p>
                </div>
                <div className="text-center px-3">
                  <p className="text-xs uppercase font-bold text-zinc-400 mb-1">Stock</p>
                  <p className="text-2xl font-black text-error">{item.stock_actual}</p>
                  <p className="text-xs text-zinc-400">mín. {item.stock_minimo}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => navigate(`/products/${item.id}/history`)}
                    className="px-3 py-2 bg-zinc-100 text-zinc-700 font-bold rounded-lg text-xs hover:bg-zinc-200 transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">history</span>
                    Historial
                  </button>
                  {isBodeguero && (
                    <button onClick={() => navigate(`/register-entry?producto_id=${item.id}`)}
                      className="px-3 py-2 bg-secondary/10 text-secondary font-bold rounded-lg text-xs hover:bg-secondary/20 transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">move_to_inbox</span>
                      Registrar Entrada
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Vencimientos */}
            {(tab === 'todos' ? vencFiltradas : tab === 'vencimiento' ? vencFiltradas : []).map((item) => {
              const dias     = parseDias(item.fecha_vencimiento)
              const etiqueta = etiquetaDias(dias)
              return (
                <div key={`venc-${item.lote_id}`}
                  className={`bg-white rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap shadow-sm ${colorFila(dias)}`}>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-100 text-amber-700 mb-1 inline-block">
                      PRÓXIMO A VENCER
                    </span>
                    <h3 className="text-lg font-bold">{item.nombre}</h3>
                    <p className="text-xs font-mono text-on-surface-variant">{item.sku}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Lote: <span className="font-mono font-bold">{item.numero_lote || '—'}</span>
                      {item.cantidad_actual != null && <span className="ml-1">· {item.cantidad_actual} uds</span>}
                    </p>
                  </div>
                  <div className="text-center px-3">
                    <p className="text-xs uppercase font-bold text-zinc-400 mb-1">Vencimiento</p>
                    <span className={`text-sm font-bold px-2 py-1 rounded-full ${etiqueta.cls}`}>
                      {etiqueta.text}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => navigate(`/products/${item.producto_id}/history`)}
                      className="px-3 py-2 bg-zinc-100 text-zinc-700 font-bold rounded-lg text-xs hover:bg-zinc-200 transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">history</span>
                      Historial
                    </button>
                    {isBodeguero && item.lote_id && (
                      <button onClick={() => navigate(`/register-sale?producto_id=${item.producto_id}&lote_id=${item.lote_id}&motivo=MERMA`)}
                        className="px-3 py-2 bg-red-50 text-error font-bold rounded-lg text-xs hover:bg-red-100 transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                        Merma
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageLayout>
  )
}