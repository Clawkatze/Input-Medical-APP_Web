const pool = require('../config/db')

// GET /api/reportes/stock
// Ahora incluye valor_total_producto y gran total al final
async function reporteStock(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT * FROM v_valor_inventario`)

    const granTotal = rows.reduce((acc, r) => acc + Number(r.valor_total_producto || 0), 0)

    const csv = [
      'SKU,Nombre,Categoría,Stock Actual,Stock Mínimo,Unidad,Precio Unitario,Valor Total',
      ...rows.map(r =>
        `${r.sku},"${r.nombre}",${r.categoria_nombre || ''},${r.stock_actual},${r.stock_minimo},${r.unidad_medida},${r.precio_unitario || 0},${r.valor_total_producto || 0}`
      ),
      // Fila de totales al pie
      `,,,,,,GRAN TOTAL,${granTotal}`,
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_stock.csv"')
    res.send('\uFEFF' + csv)
  } catch (err) { next(err) }
}

// GET /api/reportes/vencimientos
async function reporteVencimientos(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM v_alertas
      WHERE estado_vencimiento IN ('VENCIDO','PROXIMO')
      ORDER BY proximo_vencimiento ASC
    `)
    const csv = [
      'SKU,Nombre,Stock,Vencimiento,Estado',
      ...rows.map(r =>
        `${r.sku},"${r.nombre}",${r.stock_actual},${r.proximo_vencimiento || ''},${r.estado_vencimiento}`
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
      'Fecha,Tipo,Producto,SKU,Lote,Cantidad,Precio Unit.,Descuento %,Descuento $,Subtotal,Total,Motivo,Usuario',
      ...rows.map(r =>
        `${r.created_at},${r.tipo},"${r.producto_nombre}",${r.producto_sku},${r.numero_lote || ''},${r.cantidad},${r.precio_unitario || 0},${r.descuento_porcentaje || 0},${r.descuento_monto || 0},${r.subtotal || 0},${r.total || 0},${r.motivo || ''},${r.usuario_email || ''}`
      )
    ].join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_movimientos.csv"')
    res.send('\uFEFF' + csv)
  } catch (err) { next(err) }
}

module.exports = { reporteStock, reporteVencimientos, reporteMovimientos }
