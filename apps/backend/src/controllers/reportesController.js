const pool = require('../config/db')

// GET /api/reportes/stock
async function reporteStock(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT p.sku, p.nombre, c.nombre AS categoria,
             p.stock_actual, p.stock_minimo, p.unidad_medida
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.activo = true
      ORDER BY p.nombre
    `)

    const csv = [
      'SKU,Nombre,Categoría,Stock Actual,Stock Mínimo,Unidad',
      ...rows.map(r =>
        `${r.sku},"${r.nombre}",${r.categoria || ''},${r.stock_actual},${r.stock_minimo},${r.unidad_medida}`
      )
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_stock.csv"')
    res.send('\uFEFF' + csv) // BOM para que Excel lo abra bien
  } catch (err) {
    next(err)
  }
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
  } catch (err) {
    next(err)
  }
}

// GET /api/reportes/movimientos
async function reporteMovimientos(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM v_movimientos_recientes LIMIT 5000
    `)

    const csv = [
      'Fecha,Tipo,Producto,SKU,Lote,Cantidad,Motivo,Usuario',
      ...rows.map(r =>
        `${r.created_at},${r.tipo},"${r.producto_nombre}",${r.producto_sku},${r.numero_lote || ''},${r.cantidad},${r.motivo || ''},${r.usuario_email || ''}`
      )
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_movimientos.csv"')
    res.send('\uFEFF' + csv)
  } catch (err) {
    next(err)
  }
}

module.exports = { reporteStock, reporteVencimientos, reporteMovimientos }
