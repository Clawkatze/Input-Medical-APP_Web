const pool = require('../config/db')

// GET /api/reportes/stock
async function reporteStock(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT * FROM v_valor_inventario`)
    const granTotal = rows.reduce((acc, r) => acc + Number(r.valor_total_producto || 0), 0)

    const csv = [
      'SKU,Nombre,Categoría,Stock Actual,Stock Mínimo,Unidad,Precio Normal,V.DESC,Precio Vigente,Valor Total',
      ...rows.map(r =>
        `${r.sku},"${r.nombre}",${r.categoria_nombre || ''},${r.stock_actual},${r.stock_minimo},${r.unidad_medida},${r.precio_unitario || 0},${r.precio_descuento || ''},${r.precio_vigente || 0},${r.valor_total_producto || 0}`
      ),
      `,,,,,,,,GRAN TOTAL,${granTotal}`,
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_stock.csv"')
    res.send('\uFEFF' + csv)
  } catch (err) { next(err) }
}

// GET /api/reportes/vencimientos
async function reporteVencimientos(req, res, next) {
  try {
    // Incluir número de lote en el reporte de vencimientos
    const { rows } = await pool.query(`
      SELECT
        p.sku, p.nombre, p.stock_actual,
        l.numero_lote, l.fecha_vencimiento, l.cantidad_actual AS cantidad_lote,
        COALESCE(p.precio_descuento, p.precio_unitario) AS precio_vigente,
        CASE
          WHEN l.fecha_vencimiento < CURRENT_DATE THEN 'VENCIDO'
          WHEN l.fecha_vencimiento <= CURRENT_DATE + 30 THEN 'PROXIMO'
          ELSE 'OK'
        END AS estado_vencimiento
      FROM productos p
      JOIN lotes l ON l.producto_id = p.id AND l.cantidad_actual > 0
      WHERE p.activo = true
        AND l.fecha_vencimiento IS NOT NULL
        AND l.fecha_vencimiento <= CURRENT_DATE + 30
      ORDER BY l.fecha_vencimiento ASC
    `)

    const csv = [
      'SKU,Nombre,Nº Lote,Cantidad Lote,Stock Total,Fecha Vencimiento,Precio Vigente,Estado',
      ...rows.map(r =>
        `${r.sku},"${r.nombre}",${r.numero_lote},${r.cantidad_lote},${r.stock_actual},${r.fecha_vencimiento},${r.precio_vigente || 0},${r.estado_vencimiento}`
      )
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_vencimientos.csv"')
    res.send('\uFEFF' + csv)
  } catch (err) { next(err) }
}

// GET /api/reportes/movimientos
async function reporteMovimientos(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT * FROM v_movimientos_recientes LIMIT 5000`)

    const csv = [
      'Fecha,Tipo,Producto,SKU,Nº Lote,Cantidad,Precio Vigente,V.DESC,Subtotal,Total,Motivo,Usuario',
      ...rows.map(r =>
        `${r.created_at},${r.tipo},"${r.producto_nombre}",${r.producto_sku},${r.numero_lote || ''},${r.cantidad},${r.precio_unitario || 0},${r.descuento_monto || ''},${r.subtotal || 0},${r.total || 0},${r.motivo || ''},${r.usuario_email || ''}`
      )
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_movimientos.csv"')
    res.send('\uFEFF' + csv)
  } catch (err) { next(err) }
}

module.exports = { reporteStock, reporteVencimientos, reporteMovimientos }
