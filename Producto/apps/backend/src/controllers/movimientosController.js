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
  const { producto_id, cantidad, motivo, observacion } = req.body
  if (!producto_id || !cantidad) {
    return res.status(400).json({ error: 'producto_id y cantidad son requeridos' })
  }
  try {
    const { rows } = await pool.query(
      `SELECT fn_registrar_salida($1,$2,$3,$4,$5,NULL,0,0) AS movimiento_id`,
      [producto_id, Number(cantidad), motivo || 'VENTA', observacion || null, req.user.email]
    )
    res.status(201).json({ message: 'Salida registrada correctamente (FIFO)', movimientos: rows })
  } catch (err) {
    if (err.message.includes('Stock insuficiente')) {
      return res.status(400).json({ error: err.message })
    }
    next(err)
  }
}

// POST /api/movimientos/merma
// Descuenta de un lote específico elegido manualmente
async function registrarMerma(req, res, next) {
  const { producto_id, lote_id, cantidad, observacion } = req.body
  if (!producto_id || !lote_id || !cantidad) {
    return res.status(400).json({ error: 'producto_id, lote_id y cantidad son requeridos' })
  }
  try {
    const { rows } = await pool.query(
      `SELECT fn_registrar_merma($1,$2,$3,$4,$5) AS movimiento_id`,
      [producto_id, lote_id, Number(cantidad), observacion || null, req.user.email]
    )
    res.status(201).json({ movimiento_id: rows[0].movimiento_id, message: 'Merma registrada correctamente' })
  } catch (err) {
    if (err.message.includes('insuficiente') || err.message.includes('no encontrado')) {
      return res.status(400).json({ error: err.message })
    }
    next(err)
  }
}

// GET /api/movimientos/lotes/:producto_id
// Retorna los lotes activos de un producto para selección manual en merma
async function getLotesPorProducto(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, numero_lote, fecha_vencimiento, cantidad_actual, created_at
       FROM lotes
       WHERE producto_id = $1 AND cantidad_actual > 0
       ORDER BY fecha_vencimiento ASC NULLS LAST, created_at ASC`,
      [req.params.producto_id]
    )
    res.json(rows)
  } catch (err) { next(err) }
}

// GET /api/movimientos
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
    // Incluir el lote próximo a vencer para cada producto
    const { rows } = await pool.query(`
      SELECT
        v.*,
        l.id        AS lote_id,
        l.numero_lote,
        l.cantidad_actual AS lote_cantidad
      FROM v_alertas v
      LEFT JOIN lotes l ON l.producto_id = v.id
        AND l.fecha_vencimiento = v.proximo_vencimiento
        AND l.cantidad_actual > 0
      WHERE v.alerta_stock = true OR v.estado_vencimiento IN ('VENCIDO','PROXIMO')
      ORDER BY v.estado_vencimiento ASC, v.stock_actual ASC
    `)
    res.json(rows)
  } catch (err) { next(err) }
}

// GET /api/movimientos/dashboard-stats
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
async function getValorInventario(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT * FROM v_valor_inventario`)
    const granTotal = rows.reduce((acc, r) => acc + Number(r.valor_total_producto || 0), 0)
    res.json({ productos: rows, gran_total: granTotal })
  } catch (err) { next(err) }
}

module.exports = {
  registrarEntrada, registrarSalida, registrarMerma,
  getLotesPorProducto, getMovimientos, getAlertas,
  getDashboardStats, getValorInventario
}
