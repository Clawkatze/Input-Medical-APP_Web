import { useEffect, useState } from 'react'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import { formatCLP } from '../services/precio'
import toast from 'react-hot-toast'

const PERIODOS = [
  { key: 'hoy',    label: 'Hoy' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes',    label: 'Este mes' },
  { key: 'custom', label: 'Rango personalizado' },
]

export default function ReporteFinancieroPage() {
  const [periodo,     setPeriodo]     = useState('mes')
  const [fechaDesde,  setFechaDesde]  = useState('')
  const [fechaHasta,  setFechaHasta]  = useState('')
  const [datos,       setDatos]       = useState(null)
  const [loading,     setLoading]     = useState(false)

  useEffect(() => { fetchDatos() }, [periodo])

  async function fetchDatos() {
    if (periodo === 'custom' && (!fechaDesde || !fechaHasta)) return
    setLoading(true)
    try {
      const params = { periodo }
      if (periodo === 'custom') {
        params.fecha_desde = fechaDesde
        params.fecha_hasta = fechaHasta
      }
      const { data } = await api.get('/api/movimientos/reporte-financiero', { params })
      setDatos(data)
    } catch {
      toast.error('Error al cargar reporte financiero')
    } finally { setLoading(false) }
  }

  const handleCustomSubmit = (e) => {
    e.preventDefault()
    fetchDatos()
  }

  // Calcular máximo para las barras del gráfico
  const maxValor = datos?.detalle_diario?.length
    ? Math.max(...datos.detalle_diario.map(d => Math.max(d.ventas, d.mermas)), 1)
    : 1

  async function handleExportExcel() {
    try {
      const params = { periodo }
      if (periodo === 'custom') {
        params.fecha_desde = fechaDesde
        params.fecha_hasta = fechaHasta
      }
      const res = await api.get('/api/reportes/financiero', { params, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = `reporte_financiero.xlsx`; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Error al exportar') }
  }

  return (
    <PageLayout title="Reporte Financiero">
      <div className="max-w-6xl mx-auto space-y-6">

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-extrabold">Reporte Financiero</h2>
            <p className="text-on-surface-variant text-sm mt-1">Resumen de ventas, mermas y descuentos por período.</p>
          </div>
          {datos && (
            <button onClick={handleExportExcel}
              className="px-5 py-2 bg-secondary text-on-secondary font-bold rounded-lg text-sm hover:opacity-90 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Exportar Excel
            </button>
          )}
        </div>

        {/* Selector de período */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-zinc-100">
          <div className="flex gap-3 flex-wrap mb-4">
            {PERIODOS.map(p => (
              <button key={p.key} onClick={() => setPeriodo(p.key)}
                className={`px-4 py-2 rounded-lg font-bold text-sm border-2 transition-all ${
                  periodo === p.key
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          {periodo === 'custom' && (
            <form onSubmit={handleCustomSubmit} className="flex items-end gap-4 flex-wrap">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Desde</label>
                <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                  required className="h-10 px-3 bg-zinc-100 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Hasta</label>
                <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                  required className="h-10 px-3 bg-zinc-100 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm" />
              </div>
              <button type="submit"
                className="h-10 px-6 bg-primary text-white font-bold rounded-lg hover:opacity-90 text-sm">
                Consultar
              </button>
            </form>
          )}
        </div>

        {loading ? (
          <p className="text-center py-12 text-on-surface-variant">Cargando reporte...</p>
        ) : datos ? (
          <>
            {/* Tarjetas resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-zinc-100">
                <p className="text-xs font-bold uppercase text-zinc-400 mb-1">Ventas</p>
                <p className="text-3xl font-black text-secondary">{formatCLP(datos.resumen.ventas.monto)}</p>
                <p className="text-xs text-zinc-400 mt-2">
                  {datos.resumen.ventas.transacciones} transacciones · {datos.resumen.ventas.unidades} uds
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-zinc-100">
                <p className="text-xs font-bold uppercase text-zinc-400 mb-1">Descuentos aplicados</p>
                <p className="text-3xl font-black text-tertiary">-{formatCLP(datos.resumen.descuentos.monto)}</p>
                <p className="text-xs text-zinc-400 mt-2">Diferencia precio normal vs V.DESC</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-zinc-100">
                <p className="text-xs font-bold uppercase text-zinc-400 mb-1">Pérdidas por merma</p>
                <p className="text-3xl font-black text-error">-{formatCLP(datos.resumen.mermas.monto)}</p>
                <p className="text-xs text-zinc-400 mt-2">
                  {datos.resumen.mermas.transacciones} mermas · {datos.resumen.mermas.unidades} uds
                </p>
              </div>

              <div className={`rounded-xl p-6 shadow-sm border ${datos.resumen.neto >= 0 ? 'bg-secondary/5 border-secondary/20' : 'bg-error/5 border-error/20'}`}>
                <p className="text-xs font-bold uppercase text-zinc-400 mb-1">Neto (ventas - mermas)</p>
                <p className={`text-3xl font-black ${datos.resumen.neto >= 0 ? 'text-secondary' : 'text-error'}`}>
                  {datos.resumen.neto >= 0 ? '' : '-'}{formatCLP(Math.abs(datos.resumen.neto))}
                </p>
                <p className="text-xs text-zinc-400 mt-2">
                  {datos.resumen.ajustes.transacciones} ajustes en el período
                </p>
              </div>
            </div>

            {/* Gráfico de barras por día */}
            {datos.detalle_diario.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-zinc-100">
                <h3 className="font-bold text-lg mb-6">Evolución diaria</h3>
                <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2">
                  {datos.detalle_diario.map((d, i) => {
                    const altVentas = Math.round((d.ventas / maxValor) * 100)
                    const altMermas = Math.round((d.mermas / maxValor) * 100)
                    const fechaStr = d.fecha instanceof Date ? d.fecha.toISOString().split('T')[0] : String(d.fecha).split('T')[0]
                    const fecha = new Date(fechaStr + 'T00:00:00')
                    const label = !isNaN(fecha.getTime()) ? `${fecha.getDate()}/${fecha.getMonth() + 1}` : '—'
                    return (
                      <div key={i} className="flex flex-col items-center gap-1 min-w-[40px] group">
                        <div className="flex items-end gap-0.5 h-40">
                          {/* Barra ventas */}
                          <div className="w-4 bg-secondary rounded-t transition-all"
                            style={{ height: `${altVentas}%` }}
                            title={`Ventas: ${formatCLP(d.ventas)}`} />
                          {/* Barra mermas */}
                          {d.mermas > 0 && (
                            <div className="w-4 bg-error/70 rounded-t transition-all"
                              style={{ height: `${altMermas}%` }}
                              title={`Mermas: ${formatCLP(d.mermas)}`} />
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 font-mono">{label}</p>
                        {/* Tooltip al hover */}
                        <div className="hidden group-hover:block absolute bg-zinc-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 -mt-20">
                          {label}: {formatCLP(d.ventas)}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-secondary inline-block"></span> Ventas
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-error/70 inline-block"></span> Mermas
                  </span>
                </div>
              </div>
            )}

            {datos.detalle_diario.length === 0 && (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
                <span className="material-symbols-outlined text-4xl text-zinc-300 block mb-3">bar_chart</span>
                <p className="text-zinc-400">Sin movimientos en el período seleccionado.</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </PageLayout>
  )
}