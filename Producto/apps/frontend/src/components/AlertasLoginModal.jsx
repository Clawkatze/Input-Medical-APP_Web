import { useNavigate } from 'react-router-dom'
import { differenceInDays } from 'date-fns'

function colorFila(dias) {
  if (dias === null)  return ''
  if (dias < 0)       return 'bg-red-50 border-l-4 border-red-500'
  if (dias <= 30)     return 'bg-red-50 border-l-4 border-red-400'
  if (dias <= 60)     return 'bg-yellow-50 border-l-4 border-yellow-400'
  return 'bg-orange-50 border-l-4 border-orange-400'
}

function etiquetaDias(dias) {
  if (dias === null)  return { text: '—',                               cls: 'bg-zinc-100 text-zinc-500' }
  if (dias < 0)       return { text: `Vencido hace ${Math.abs(dias)}d`, cls: 'bg-red-100 text-red-700' }
  if (dias === 0)     return { text: 'Vence hoy',                       cls: 'bg-red-100 text-red-700' }
  if (dias <= 30)     return { text: `${dias}d`,                        cls: 'bg-red-100 text-red-700' }
  if (dias <= 60)     return { text: `${dias}d`,                        cls: 'bg-yellow-100 text-yellow-700' }
  return               { text: `${dias}d`,                              cls: 'bg-orange-100 text-orange-700' }
}

export default function AlertasLoginModal({ alertas, onClose }) {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="p-6 border-b flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-red-600 text-2xl">notification_important</span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Alertas de Vencimiento</h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              {alertas.length} lote{alertas.length !== 1 ? 's' : ''} con vencimiento en los próximos 90 días sin revisar hoy
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-600 shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {alertas.map((a) => {
            const dias     = a.fecha_vencimiento
              ? differenceInDays(new Date(a.fecha_vencimiento), new Date())
              : null
            const etiqueta = etiquetaDias(dias)
            return (
              <div key={a.lote_id || a.producto_id}
                className={`rounded-lg px-4 py-3 flex items-center justify-between gap-4 ${colorFila(dias)}`}>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{a.nombre}</p>
                  <p className="text-xs text-zinc-500 font-mono">
                    SKU: {a.sku} · Lote: {a.numero_lote || '—'} · {a.cantidad_actual} uds
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap shrink-0 ${etiqueta.cls}`}>
                  {etiqueta.text}
                </span>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t">
          <button
            onClick={() => { onClose(); navigate('/alerts') }}
            className="w-full py-3 bg-red-500 text-white rounded-xl font-bold shadow hover:bg-red-600 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">notifications_active</span>
            Ver Alertas
          </button>
        </div>

      </div>
    </div>
  )
}
