import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { differenceInDays } from 'date-fns'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

// Colores por días restantes — sin morado (reservado para eliminaciones)
function colorFila(dias) {
  if (dias === null)  return ''
  if (dias < 0)       return 'bg-red-50 border-l-4 border-red-500'
  if (dias <= 30)     return 'bg-red-50 border-l-4 border-red-400'
  if (dias <= 60)     return 'bg-yellow-50 border-l-4 border-yellow-400'
  if (dias <= 90)     return 'bg-orange-50 border-l-4 border-orange-400'
  return ''
}

function etiquetaDias(dias) {
  if (dias === null)  return { text: '—',                               cls: 'bg-zinc-100 text-zinc-500' }
  if (dias < 0)       return { text: `Vencido hace ${Math.abs(dias)}d`, cls: 'bg-red-100 text-red-700' }
  if (dias === 0)     return { text: 'Vence hoy',                       cls: 'bg-red-100 text-red-700' }
  if (dias <= 30)     return { text: `${dias}d`,                        cls: 'bg-red-100 text-red-700' }
  if (dias <= 60)     return { text: `${dias}d`,                        cls: 'bg-yellow-100 text-yellow-700' }
  return               { text: `${dias}d`,                              cls: 'bg-orange-100 text-orange-700' }
}

export default function AlertsPage() {
  const [alertas,  setAlertas]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filtro,   setFiltro]   = useState('todos')
  const [diasFiltro, setDiasFiltro] = useState(null) // null = todos, 30, 60, 90
  const { isAdmin, isBodeguero } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const filtroUrl = searchParams.get('filtro')
    if (filtroUrl === 'vencimiento') setFiltro('vencimiento')
    if (filtroUrl === 'stock')       setFiltro('stock')

    api.get('/api/movimientos/alertas')
      .then(({ data }) => setAlertas(data))
      .catch(() => toast.error('Error al cargar alertas'))
      .finally(() => setLoading(false))
  }, [])

  const getDias = (fecha) => {
    if (!fecha) return null
    const str = fecha instanceof Date ? fecha.toISOString().split('T')[0] : String(fecha).split('T')[0]
    const d = new Date(str + 'T00:00:00')
    if (isNaN(d.getTime())) return null
    return differenceInDays(d, new Date())
  }

  // Filtro por tipo (stock / vencimiento / todos)
  const porTipo = alertas.filter(item => {
    if (filtro === 'stock')       return item.alerta_stock
    if (filtro === 'vencimiento') return item.estado_vencimiento === 'VENCIDO' || item.estado_vencimiento === 'PROXIMO'
    return true
  })

  // Filtro adicional por rango de días (30 / 60 / 90)
  const alertasFiltradas = porTipo.filter(item => {
    if (!diasFiltro) return true
    const dias = getDias(item.proximo_vencimiento)
    if (dias === null) return false
    return dias <= diasFiltro
  })

  const contStock      = alertas.filter(a => a.alerta_stock).length
  const contVencimiento = alertas.filter(a => a.estado_vencimiento === 'VENCIDO' || a.estado_vencimiento === 'PROXIMO').length

  return (
    <PageLayout title="Alertas del Sistema">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold mb-1">Monitor de Estado</h2>
          <p className="text-on-surface-variant">Revisión proactiva de stock y vencimientos.</p>
        </div>

        {/* Filtros por tipo */}
        <div className="flex gap-3 mb-4 flex-wrap">
          {[
            { key: 'todos',       label: `Todos (${alertas.length})`,           color: '' },
            { key: 'stock',       label: `Stock Crítico (${contStock})`,         color: 'text-error' },
            { key: 'vencimiento', label: `Vencimiento (${contVencimiento})`,     color: 'text-amber-600' },
          ].map(f => (
            <button key={f.key} onClick={() => { setFiltro(f.key); setDiasFiltro(null) }}
              className={`px-4 py-2 rounded-lg font-bold text-sm border-2 transition-all ${
                filtro === f.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}>
              <span className={filtro !== f.key && f.color ? f.color : ''}>{f.label}</span>
            </button>
          ))}
        </div>

        {/* Filtros por días — solo visible en pestaña vencimiento o todos */}
        {(filtro === 'vencimiento' || filtro === 'todos') && (
          <div className="flex gap-2 mb-6 items-center">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Vence en:</span>
            {[
              { val: 30,  label: '≤ 30 días', cls: 'border-red-300 text-red-600 bg-red-50' },
              { val: 60,  label: '≤ 60 días', cls: 'border-yellow-300 text-yellow-700 bg-yellow-50' },
              { val: 90,  label: '≤ 90 días', cls: 'border-orange-300 text-orange-600 bg-orange-50' },
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
        ) : alertasFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
            <span className="material-symbols-outlined text-5xl text-secondary mb-4 block">check_circle</span>
            <h3 className="text-xl font-bold mb-2">Sin alertas activas</h3>
            <p className="text-on-surface-variant">No hay productos que requieran atención en este momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alertasFiltradas.map((item, idx) => {
              const dias     = getDias(item.proximo_vencimiento)
              const etiqueta = etiquetaDias(dias)
              const esVencido = item.estado_vencimiento === 'VENCIDO'
              const esCritico = item.alerta_stock

              return (
                <div key={`${item.id}-${idx}`}
                  className={`bg-white rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap shadow-sm ${colorFila(dias)}`}>

                  {/* Info producto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {esCritico && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-red-100 text-red-700">STOCK CRÍTICO</span>
                      )}
                      {item.estado_vencimiento !== 'OK' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${esVencido ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {esVencido ? 'VENCIDO' : 'PRÓXIMO A VENCER'}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold">{item.nombre}</h3>
                    <p className="text-xs font-mono text-on-surface-variant">{item.sku}</p>
                    {item.numero_lote && (
                      <p className="text-xs text-on-surface-variant mt-1">
                        Lote: <span className="font-mono font-bold">{item.numero_lote}</span>
                        {item.lote_cantidad && <span className="ml-1">· {item.lote_cantidad} uds</span>}
                      </p>
                    )}
                  </div>

                  {/* Stock */}
                  <div className="text-center px-3">
                    <p className="text-xs uppercase font-bold text-zinc-400 mb-1">Stock</p>
                    <p className={`text-2xl font-black ${esCritico ? 'text-error' : 'text-on-surface'}`}>
                      {item.stock_actual}
                    </p>
                    <p className="text-xs text-zinc-400">mín. {item.stock_minimo}</p>
                  </div>

                  {/* Vencimiento */}
                  {item.proximo_vencimiento && (
                    <div className="text-center px-3">
                      <p className="text-xs uppercase font-bold text-zinc-400 mb-1">Vencimiento</p>
                      <span className={`text-sm font-bold px-2 py-1 rounded-full ${etiqueta.cls}`}>
                        {etiqueta.text}
                      </span>
                    </div>
                  )}

                  {/* Acciones contextuales */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Ver historial — siempre disponible */}
                    <button
                      onClick={() => navigate(`/products/${item.id}/history`)}
                      className="px-3 py-2 bg-zinc-100 text-zinc-700 font-bold rounded-lg text-xs hover:bg-zinc-200 transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">history</span>
                      Historial
                    </button>

                    {/* Stock crítico → Registrar Entrada */}
                    {esCritico && isBodeguero && (
                      <button
                        onClick={() => navigate(`/register-entry?producto_id=${item.id}`)}
                        className="px-3 py-2 bg-secondary/10 text-secondary font-bold rounded-lg text-xs hover:bg-secondary/20 transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">move_to_inbox</span>
                        Registrar Entrada
                      </button>
                    )}

                    {/* Vencimiento → Registrar Merma (solo si hay lote) */}
                    {item.estado_vencimiento !== 'OK' && item.numero_lote && isBodeguero && (
                      <button
                        onClick={() => navigate(`/register-sale?producto_id=${item.id}&lote_id=${item.lote_id}&motivo=MERMA`)}
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