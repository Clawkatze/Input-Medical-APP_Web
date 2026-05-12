const pool = require('../config/db')

// POST /api/movimientos/entrada
async function registrarEntrada(req, res, next) {
  const { producto_id, numero_lote, fecha_vencimiento, cantidad, observacion } = req.body
  if (!producto_id || !numero_lote || !cantidad) {
    return res.status(400).json({ error: 'producto_id, numero_lote y cantidad son requeridos' })
  }
  try {
    const { rows } = await pool.query(
      `SELECT fn_registrar_entrada($1,$2,$3,$4,$5,$6) AS movimiento_id`,
      [producto_id, numero_lote, fecha_vencimiento || null,
       Number(cantidad), observacion || null, req.user.email]
    )
    res.status(201).json({ movimiento_id: rows[0].movimiento_id, message: 'Entrada registrada correctamente' })
  } catch (err) { next(err) }
}

// POST /api/movimientos/salida
async function registrarSalida(req, res, next) {
  const {
    producto_id, cantidad, motivo, observacion,
    precio_unitario, descuento_porcentaje, descuento_monto
  } = req.body

  if (!producto_id || !cantidad) {
    return res.status(400).json({ error: 'producto_id y cantidad son requeridos' })
  }
  try {
    const { rows } = await pool.query(
      `SELECT fn_registrar_salida($1,$2,$3,$4,$5,$6,$7,$8) AS movimiento_id`,
      [
        producto_id, Number(cantidad), motivo || 'VENTA',
        observacion || null, req.user.email,
        Number(precio_unitario)      || 0,
        Number(descuento_porcentaje) || 0,
        Number(descuento_monto)      || 0,
      ]
    )
    res.status(201).json({ message: 'Salida registrada correctamente (FIFO)', movimientos: rows })
  } catch (err) {
    if (err.message.includes('Stock insuficiente')) {
      return res.status(400).json({ error: err.message })
    }
    next(err)
  }
}

// GET /api/movimientos?producto_id=&limit=50
async function getMovimientos(req, res, next) {
  const { producto_id, limit = 50 } = req.query
  try {
    let query = 'SELECT * FROM v_movimientos_recientes'
    const params = []
    if (producto_id) {
      params.push(producto_id)
      query += ` WHERE producto_id = $1`
    }
    query += ` LIMIT $${params.length + 1}`
    params.push(Number(limit))
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (err) { next(err) }
}

// GET /api/movimientos/alertas
async function getAlertas(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM v_alertas
      WHERE alerta_stock = true OR estado_vencimiento IN ('VENCIDO','PROXIMO')
      ORDER BY estado_vencimiento ASC, stock_actual ASC
    `)
    res.json(rows)
  } catch (err) { next(err) }
}

// GET /api/movimientos/dashboard-stats
// Ahora incluye valor_total_inventario
async function getDashboardStats(req, res, next) {
  try {
    const [total, critico, alertasVenc, movHoy, ventasHoy, valorInventario] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM productos WHERE activo = true`),
      pool.query(`SELECT COUNT(*) FROM productos WHERE activo = true AND stock_actual <= stock_minimo`),
      pool.query(`SELECT COUNT(*) FROM v_alertas WHERE estado_vencimiento IN ('VENCIDO','PROXIMO')`),
      pool.query(`SELECT COUNT(*) FROM movimientos WHERE created_at >= CURRENT_DATE`),
      pool.query(`SELECT COALESCE(SUM(total),0) AS total_ventas FROM movimientos WHERE tipo='SALIDA' AND created_at >= CURRENT_DATE`),
      pool.query(`SELECT fn_gran_total_inventario() AS gran_total`),
    ])
    res.json({
      total_productos:        Number(total.rows[0].count),
      stock_critico:          Number(critico.rows[0].count),
      proximos_vencer:        Number(alertasVenc.rows[0].count),
      movimientos_hoy:        Number(movHoy.rows[0].count),
      ventas_hoy:             Number(ventasHoy.rows[0].total_ventas),
      valor_total_inventario: Number(valorInventario.rows[0].gran_total),
    })
  } catch (err) { next(err) }
}

// GET /api/movimientos/valor-inventario
// Detalle por producto para la tabla de Productos
async function getValorInventario(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT * FROM v_valor_inventario`)
    const granTotal = rows.reduce((acc, r) => acc + Number(r.valor_total_producto || 0), 0)
    res.json({ productos: rows, gran_total: granTotal })
  } catch (err) { next(err) }
}

module.exports = {
  registrarEntrada, registrarSalida, getMovimientos,
  getAlertas, getDashboardStats, getValorInventario
}
