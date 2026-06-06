import { useEffect, useRef, useState } from 'react'
import JsBarcode from 'jsbarcode'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function PrintLabelModal({ producto, lote, onClose }) {
  const [cantidad, setCantidad] = useState(lote.cantidad)
  const canvasRef = useRef(null)

  // Generar código de barras en canvas
  const barcodeValue = producto.codigo_barras || producto.sku

  useEffect(() => {
    if (!canvasRef.current) return
    try {
      JsBarcode(canvasRef.current, barcodeValue, {
        format:      'CODE128',
        width:       2,
        height:      40,
        displayValue: false,
        margin:      0,
      })
    } catch {
      /* valor inválido para barcode */
    }
  }, [barcodeValue])

  const handleImprimir = () => {
    const canvas = canvasRef.current
    const barcodeDataUrl = canvas ? canvas.toDataURL('image/png') : ''

    const fechaVenc = lote.fecha_vencimiento
      ? format(new Date(lote.fecha_vencimiento), 'dd/MM/yyyy', { locale: es })
      : null

    // Construir HTML de etiquetas
    const etiquetas = Array.from({ length: Number(cantidad) }).map(() => `
      <div class="label">
        <div class="brand">INPUT MEDICAL</div>
        <div class="nombre">${producto.nombre}</div>
        <div class="sku">SKU: ${producto.sku}</div>
        ${barcodeDataUrl ? `<img class="barcode-img" src="${barcodeDataUrl}" />` : ''}
        <div class="barcode-num">${barcodeValue}</div>
        ${fechaVenc ? `<div class="venc">Vence: ${fechaVenc}</div>` : ''}
      </div>
    `).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    @page {
      size: 50mm 30mm;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: white; }
    .label {
      width: 50mm;
      height: 30mm;
      padding: 2mm 3mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      page-break-after: always;
      overflow: hidden;
    }
    .label:last-child { page-break-after: avoid; }
    .brand {
      font-family: Arial, sans-serif;
      font-size: 6pt;
      font-weight: 900;
      letter-spacing: 0.5pt;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 1mm;
    }
    .nombre {
      font-family: Arial, sans-serif;
      font-size: 7pt;
      font-weight: bold;
      text-align: center;
      line-height: 1.2;
      margin-bottom: 1mm;
      max-width: 100%;
    }
    .sku {
      font-family: monospace;
      font-size: 5.5pt;
      color: #666;
      margin-bottom: 1.5mm;
    }
    .barcode-img {
      width: 36mm;
      height: 10mm;
      object-fit: fill;
      display: block;
    }
    .barcode-num {
      font-family: monospace;
      font-size: 5pt;
      margin-top: 0.5mm;
      color: #333;
    }
    .venc {
      font-family: Arial, sans-serif;
      font-size: 5.5pt;
      margin-top: 1mm;
      color: #333;
    }
  </style>
</head>
<body>${etiquetas}</body>
</html>`

    const win = window.open('', '_blank', 'width=400,height=300')
    win.document.write(html)
    win.document.close()
    win.focus()
    win.onload = () => { win.print(); win.close() }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary">label</span>
          </div>
          <div>
            <h2 className="text-lg font-bold">Imprimir Etiquetas</h2>
            <p className="text-sm text-zinc-500">Lote: {lote.numero_lote}</p>
          </div>
        </div>

        {/* Preview barcode oculto */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Info producto */}
        <div className="bg-zinc-50 rounded-xl p-4 text-sm space-y-1">
          <p className="font-bold truncate">{producto.nombre}</p>
          <p className="text-zinc-500 font-mono text-xs">SKU: {producto.sku}</p>
          {lote.fecha_vencimiento && (
            <p className="text-zinc-500 text-xs">
              Vence: {format(new Date(lote.fecha_vencimiento), 'dd MMM yyyy', { locale: es })}
            </p>
          )}
        </div>

        {/* Input cantidad */}
        <div>
          <label className="block text-sm font-semibold text-zinc-600 mb-2">
            ¿Cuántas etiquetas imprimir?
          </label>
          <input
            type="number"
            min="1"
            max="500"
            value={cantidad}
            onChange={e => setCantidad(e.target.value)}
            className="w-full h-14 px-4 bg-zinc-100 rounded-xl text-2xl font-black text-center outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-zinc-200 rounded-xl font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Omitir
          </button>
          <button
            onClick={handleImprimir}
            disabled={!cantidad || Number(cantidad) < 1}
            className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl font-bold shadow hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Imprimir
          </button>
        </div>

      </div>
    </div>
  )
}
