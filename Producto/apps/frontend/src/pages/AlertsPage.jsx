import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function AlertsPage() {
  const [alertas,  setAlertas]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filtro,   setFiltro]   = useState('todos')
  const { isBodeguero, clearAlertasCount } = useAuth()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    clearAlertasCount()

    // Si viene desde el dashboard con ?filtro=vencimiento, preseleccionar filtro
    const filtroUrl = searchParams.get('filtro')
    if (filtroUrl === 'vencimiento') setFiltro('vencimiento')

    api.get('/api/movimientos/alertas')
      .then(({ data }) => setAlertas(data))
      .catch(() => toast.error('Error al cargar alertas'))
      .finally(() => setLoading(false))
  }, [])

  const dias = (fecha) => fecha ? differenceInDays(new Date(fecha), new Date()) : null

  const alertasFiltradas = alertas.filter(item => {
    if (filtro === 'stock')      return item.alerta_stock
    if (filtro === 'vencimiento') return item.estado_vencimiento === 'VENCIDO' || item.estado_vencimiento === 'PROXIMO'
    return true
  })

  const getBadge = (item) => {
    if (item.estado_vencimiento === 'VENCIDO')  return { label: 'VENCIDO',          cls: 'bg-error text-white' }
    if (item.alerta_stock && item.estado_vencimiento === 'PROXIMO') return { label: 'CRÍTICO', cls: 'bg-error text-white' }
    if (item.estado_vencimiento === 'PROXIMO')  return { label: 'PRÓXIMO A VENCER', cls: 'bg-tertiary-fixed text-on-tertiary-fixed' }
    return { label: 'STOCK CRÍTICO', cls: 'bg-orange-100 text-orange-700' }
  }

  const borderColor = (item) => item.estado_vencimiento === 'VENCIDO' ? 'border-error' : 'border-tertiary'

  const contStock      = alertas.filter(a => a.alerta_stock).length
  const contVencimiento = alertas.filter(a => a.estado_vencimiento === 'VENCIDO' || a.estado_vencimiento === 'PROXIMO').length

  return (
    <PageLayout title="Alertas del Sistema">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-4xl font-extrabold mb-3">Monitor de Estado</h2>
          <p className="text-lg text-on-surface-variant">Gestión proactiva de inventario médico.</p>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 mb-6">
          {[
            { key: 'todos',       label: `Todos (${alertas.length})` },
            { key: 'stock',       label: `Stock Crítico (${contStock})`,       color: 'text-error' },
            { key: 'vencimiento', label: `Vencimiento (${contVencimiento})`,   color: 'text-tertiary' },
          ].map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`px-4 py-2 rounded-lg font-bold text-sm border-2 transition-all ${
                filtro === f.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}>
              <span className={filtro !== f.key && f.color ? f.color : ''}>{f.label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center py-12 text-on-surface-variant">Cargando alertas...</p>
        ) : alertasFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
            <span className="material-symbols-outlined text-5xl text-secondary mb-4 block">check_circle</span>
            <h3 className="text-xl font-bold mb-2">
              {filtro === 'todos' ? 'Todo en orden' : `Sin alertas de ${filtro === 'stock' ? 'stock crítico' : 'vencimiento'}`}
            </h3>
            <p className="text-on-surface-variant">No hay alertas activas en este momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alertasFiltradas.map((item, idx) => {
              const badge = getBadge(item)
              const d     = dias(item.proximo_vencimiento)
              return (
                <div key={`${item.id}-${idx}`} className={`bg-white border-l-4 ${borderColor(item)} p-6 rounded-xl shadow-sm`}>
                  <div className="flex items-center justify-between gap-6 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${badge.cls}`}>{badge.label}</span>
                      <h3 className="text-xl font-bold mt-2">{item.nombre}</h3>
                      <p className="text-on-surface-variant text-sm font-mono">{item.sku}</p>
                      {item.numero_lote && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">label</span>
                          <p className="text-sm">
                            Lote afectado: <span className="font-mono font-bold text-on-surface">{item.numero_lote}</span>
                            {item.lote_cantidad && (
                              <span className="text-on-surface-variant ml-2">({item.lote_cantidad} unidades)</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="text-center px-4">
                      <p className="text-xs uppercase font-bold text-on-surface-variant mb-1">Stock Total</p>
                      <p className={`text-2xl font-black ${item.alerta_stock ? 'text-error' : 'text-on-surface'}`}>{item.stock_actual}</p>
                      <p className="text-xs text-on-surface-variant">mín. {item.stock_minimo}</p>
                    </div>

                    {item.proximo_vencimiento && (
                      <div className="text-center px-4">
                        <p className="text-xs uppercase font-bold text-on-surface-variant mb-1">Vencimiento</p>
                        <p className={`text-lg font-bold ${d !== null && d < 0 ? 'text-error' : 'text-tertiary'}`}>
                          {d !== null && d < 0 ? `${Math.abs(d)} días vencido` : d !== null ? `En ${d} días` : '—'}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {format(new Date(item.proximo_vencimiento), 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    )}

                    {item.numero_lote && isBodeguero && (
                      <div>
                        <a href={`/register-sale?producto_id=${item.id}&lote_id=${item.lote_id}&motivo=MERMA`}
                          className="px-4 py-2 bg-error/10 text-error font-bold rounded-lg text-sm hover:bg-error/20 transition-colors flex items-center gap-2 whitespace-nowrap">
                          <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                          Registrar Merma
                        </a>
                      </div>
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
