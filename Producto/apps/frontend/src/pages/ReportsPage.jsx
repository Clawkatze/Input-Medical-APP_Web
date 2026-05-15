import { useState } from 'react'
import api from '../services/api'
import { PageLayout } from '../components/Layout'
import toast from 'react-hot-toast'

export default function ReportsPage() {
  const [loading, setLoading] = useState({})
  const setL = (key, val) => setLoading(l => ({ ...l, [key]: val }))

  const descargar = async (endpoint, filename, key) => {
    setL(key, true)
    try {
      const res = await api.get(endpoint, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      toast.success(`${filename} generado`)
    } catch {
      toast.error('Error al generar reporte')
    } finally {
      setL(key, false)
    }
  }

  const CARDS = [
    { key: 'stock', title: 'Stock Actual',         desc: 'Detalle consolidado de existencias activas.',        icon: 'inventory',   color: 'bg-primary-fixed text-primary',                         endpoint: '/api/reportes/stock',        file: 'reporte_stock.csv' },
    { key: 'venc',  title: 'Productos por Vencer',  desc: 'Insumos críticos próximos a vencer o ya vencidos.', icon: 'event_busy',  color: 'bg-tertiary-fixed text-tertiary',                       endpoint: '/api/reportes/vencimientos',  file: 'reporte_vencimientos.csv' },
    { key: 'mov',   title: 'Movimientos (Kardex)',  desc: 'Trazabilidad completa de entradas y salidas.',       icon: 'swap_horiz',  color: 'bg-secondary-fixed-dim text-on-secondary-fixed-variant', endpoint: '/api/reportes/movimientos',   file: 'reporte_movimientos.csv' },
  ]

  return (
    <PageLayout title="Reportes de Inventario">
      <div className="mb-10">
        <h1 className="text-4xl font-black mb-2">Análisis de Operaciones</h1>
        <p className="text-on-surface-variant text-lg">Generación de informes detallados en formato CSV.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CARDS.map(card => (
          <div key={card.key} className="bg-white p-6 rounded-xl shadow-sm border border-outline-variant/15 flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className={`p-3 w-fit rounded-lg mb-4 ${card.color}`}>
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
              <h3 className="text-xl font-bold mb-2">{card.title}</h3>
              <p className="text-sm text-on-surface-variant mb-6">{card.desc}</p>
            </div>
            <button
              onClick={() => descargar(card.endpoint, card.file, card.key)}
              disabled={loading[card.key]}
              className="w-full py-3 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              {loading[card.key] ? 'Generando...' : 'Generar Reporte CSV'}
            </button>
          </div>
        ))}
      </div>
    </PageLayout>
  )
}
