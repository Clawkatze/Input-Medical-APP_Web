const pool = require('../config/db')
const ExcelJS = require('exceljs')

const COLOR = {
  HEADER_BG: '1A56DB',
  HEADER_FG: 'FFFFFF',
  TOTAL_BG:  'DBEAFE',
  MERMA_BG:  'FEE2E2',
  ENTRADA_BG:'F0FDF4',
  AJUSTE_BG: 'F9FAFB',
  BORDER:    'D1D5DB',
}

function formatFechaHora(val) {
  if (!val) return '—'
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    weekday: 'short', day: '2-digit', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(val))
}

function formatFechaSolo(val) {
  if (!val) return '—'
  const d = new Date(val + 'T00:00:00')
  const M = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${d.getDate().toString().padStart(2,'0')} ${M[d.getMonth()]} ${d.getFullYear()}`
}

function borde() {
  const b = { style: 'thin', color: { argb: COLOR.BORDER } }
  return { top: b, bottom: b, left: b, right: b }
}

function estiloHeader(cell) {
  cell.font      = { bold: true, color: { argb: COLOR.HEADER_FG }, name: 'Arial', size: 10 }
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.HEADER_BG } }
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  cell.border    = borde()
}

function estiloBase(cell, bg) {
  if (bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
  cell.border    = borde()
  cell.font      = { name: 'Arial', size: 9 }
  cell.alignment = { vertical: 'middle' }
}

function estiloNum(cell, bg) {
  estiloBase(cell, bg)
  cell.numFmt    = '#.##0'
  cell.alignment = { horizontal: 'right', vertical: 'middle' }
}

function setup(wb, nombre, cabeceras, anchos) {
  const ws = wb.addWorksheet(nombre, { pageSetup: { orientation: 'landscape', fitToPage: true } })
  const row = ws.addRow(cabeceras)
  row.height = 28
  row.eachCell(estiloHeader)
  ws.autoFilter = { from: { row:1, column:1 }, to: { row:1, column: cabeceras.length } }
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  anchos.forEach((w, i) => { ws.getColumn(i+1).width = w })
  return ws
}

// GET /api/reportes/stock
async function reporteStock(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT * FROM v_valor_inventario`)
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Input Medical'; wb.created = new Date()

    const ws = setup(wb, 'Stock Actual',
      ['SKU','Nombre','Categoría','Stock Actual','Stock Mínimo','Unidad','Precio Normal','V.DESC','Precio Vigente','Valor Total'],
      [18, 36, 16, 13, 13, 10, 15, 15, 15, 16]
    )

    rows.forEach(r => {
      const bg = (r.precio_descuento && Number(r.precio_descuento) > 0) ? 'FFF9C4' : null
      const row = ws.addRow([
        r.sku, r.nombre, r.categoria_nombre || '—',
        Number(r.stock_actual), Number(r.stock_minimo), r.unidad_medida,
        Number(r.precio_unitario) || 0,
        r.precio_descuento ? Number(r.precio_descuento) : '—',
        Number(r.precio_vigente) || 0,
        Number(r.valor_total_producto) || 0,
      ])
      row.height = 20
      row.eachCell((cell, col) => col >= 7 ? estiloNum(cell, bg) : estiloBase(cell, bg))
    })

    // Gran total
    const granTotal = rows.reduce((a, r) => a + Number(r.valor_total_producto || 0), 0)
    const tr = ws.addRow(['','','','','','','','','GRAN TOTAL', granTotal])
    tr.height = 22
    tr.eachCell((cell, col) => {
      cell.font   = { bold: true, name: 'Arial', size: 10 }
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.TOTAL_BG } }
      cell.border = borde()
      if (col === 9) cell.alignment = { horizontal: 'right', vertical: 'middle' }
      if (col === 10) { cell.numFmt = '#.##0'; cell.alignment = { horizontal: 'right', vertical: 'middle' } }
    })

    const buf = await wb.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_stock.xlsx"')
    res.send(buf)
  } catch (err) { next(err) }
}

// GET /api/reportes/vencimientos
async function reporteVencimientos(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT p.sku, p.nombre, p.stock_actual,
        l.numero_lote, l.fecha_vencimiento, l.cantidad_actual AS cantidad_lote,
        COALESCE(p.precio_descuento, p.precio_unitario) AS precio_vigente,
        CASE
          WHEN l.fecha_vencimiento < CURRENT_DATE       THEN 'VENCIDO'
          WHEN l.fecha_vencimiento <= CURRENT_DATE + 30 THEN 'PRÓXIMO'
          ELSE 'OK'
        END AS estado_vencimiento,
        (l.fecha_vencimiento - CURRENT_DATE) AS dias_restantes
      FROM productos p
      JOIN lotes l ON l.producto_id = p.id AND l.cantidad_actual > 0
      WHERE p.activo = true AND l.fecha_vencimiento IS NOT NULL
        AND l.fecha_vencimiento <= CURRENT_DATE + 30
      ORDER BY l.fecha_vencimiento ASC
    `)

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Input Medical'; wb.created = new Date()

    const ws = setup(wb, 'Vencimientos',
      ['SKU','Nombre','Nº Lote','Cant. Lote','Stock Total','Fecha Vencimiento','Días Restantes','Precio Vigente','Estado'],
      [18, 36, 16, 12, 12, 18, 20, 15, 12]
    )

    rows.forEach(r => {
      const vencido = r.estado_vencimiento === 'VENCIDO'
      const proximo = r.estado_vencimiento === 'PRÓXIMO'
      const bg = vencido ? COLOR.MERMA_BG : proximo ? 'FEF9C3' : null
      const dias = Number(r.dias_restantes)
      const diasTexto = dias < 0 ? `Vencido hace ${Math.abs(dias)} días` : `${dias} días`

      const row = ws.addRow([
        r.sku, r.nombre, r.numero_lote,
        Number(r.cantidad_lote), Number(r.stock_actual),
        formatFechaSolo(r.fecha_vencimiento), diasTexto,
        Number(r.precio_vigente) || 0,
        r.estado_vencimiento,
      ])
      row.height = 20
      row.eachCell((cell, col) => col === 8 ? estiloNum(cell, bg) : estiloBase(cell, bg))
      const ec = row.getCell(9)
      ec.font = { bold: true, name: 'Arial', size: 9,
        color: { argb: vencido ? 'DC2626' : proximo ? 'D97706' : '16A34A' } }
    })

    const buf = await wb.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_vencimientos.xlsx"')
    res.send(buf)
  } catch (err) { next(err) }
}

// GET /api/reportes/movimientos
async function reporteMovimientos(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT * FROM v_movimientos_recientes LIMIT 5000`)
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Input Medical'; wb.created = new Date()

    const ws = setup(wb, 'Kardex',
      ['Fecha','Tipo','Motivo','Producto','SKU','Nº Lote','Cantidad','Precio Vigente','Descuento','Total','Usuario'],
      [24, 10, 10, 36, 18, 16, 10, 15, 14, 15, 28]
    )

    rows.forEach(r => {
      const esEntrada = r.tipo === 'ENTRADA'
      const esMerma   = r.motivo === 'MERMA'
      const esAjuste  = r.motivo === 'AJUSTE'
      const bg = esMerma ? COLOR.MERMA_BG : esEntrada ? COLOR.ENTRADA_BG : esAjuste ? COLOR.AJUSTE_BG : null

      const cantidad = esEntrada ? Number(r.cantidad) : -Number(r.cantidad)
      const total    = r.total   ? Number(r.total) * (esMerma ? -1 : 1) : null

      const row = ws.addRow([
        formatFechaHora(r.created_at),
        r.tipo,
        r.motivo || '—',
        r.producto_nombre,
        r.producto_sku,
        r.numero_lote || '—',
        cantidad,
        r.precio_unitario ? Number(r.precio_unitario) : null,
        r.descuento_monto > 0 ? Number(r.descuento_monto) : null,
        total,
        r.usuario_email || '—',
      ])
      row.height = 20
      row.eachCell((cell, col) => {
        if ([8, 9, 10].includes(col)) {
          estiloNum(cell, bg)
          if (col === 10 && esMerma && cell.value)
            cell.font = { bold: true, name: 'Arial', size: 9, color: { argb: 'DC2626' } }
        } else if (col === 7) {
          estiloBase(cell, bg)
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.font = { bold: true, name: 'Arial', size: 9,
            color: { argb: esEntrada ? '16A34A' : esMerma ? 'DC2626' : '1A56DB' } }
        } else {
          estiloBase(cell, bg)
        }
      })
      row.getCell(2).font = { bold: true, name: 'Arial', size: 9,
        color: { argb: esEntrada ? '16A34A' : esMerma ? 'DC2626' : '1A56DB' } }
    })

    const buf = await wb.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_movimientos.xlsx"')
    res.send(buf)
  } catch (err) { next(err) }
}

module.exports = { reporteStock, reporteVencimientos, reporteMovimientos }
