const pool = require('../config/db')

// Medianoche en hora Chile (America/Santiago)
// Así "hoy" en el dashboard siempre es 00:00 Santiago, no UTC
const HOY_SANTIAGO = `DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Santiago') AT TIME ZONE 'America/Santiago'`

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

async function getAlertas(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT
        v.*,
        l.id             AS lote_id,
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

async function getDashboardStats(req, res, next) {
  try {
    const [total, critico, alertasVenc, movHoy, ventasHoy, mermasHoy, descuentosHoy, valorInventario] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM productos WHERE activo = true AND eliminado_at IS NULL`),
      pool.query(`SELECT COUNT(*) FROM productos WHERE activo = true AND eliminado_at IS NULL AND stock_actual <= stock_minimo`),
      pool.query(`
        SELECT COUNT(DISTINCT l.id)::int AS count
        FROM lotes l
        JOIN productos p ON p.id = l.producto_id
        WHERE p.activo = true
          AND p.eliminado_at IS NULL
          AND l.cantidad_actual > 0
          AND l.fecha_vencimiento IS NOT NULL
          AND l.fecha_vencimiento <= CURRENT_DATE + (90 * INTERVAL '1 day')
      `),
      // Movimientos de hoy en hora Chile
      pool.query(`SELECT COUNT(*) FROM movimientos WHERE created_at >= ${HOY_SANTIAGO}`),
      // Ventas de hoy en hora Chile
      pool.query(`SELECT COALESCE(SUM(total),0) AS total_ventas FROM movimientos
        WHERE tipo='SALIDA' AND motivo IN ('VENTA','TRASLADO')
        AND created_at >= ${HOY_SANTIAGO}`),
      // Mermas de hoy en hora Chile
      pool.query(`SELECT COALESCE(SUM(total),0) AS total_mermas FROM movimientos
        WHERE tipo='SALIDA' AND motivo='MERMA'
        AND created_at >= ${HOY_SANTIAGO}`),
      // Descuentos de hoy en hora Chile
      pool.query(`SELECT COALESCE(SUM(descuento_monto),0) AS total_descuentos FROM movimientos
        WHERE tipo='SALIDA' AND motivo='VENTA' AND descuento_monto > 0
        AND created_at >= ${HOY_SANTIAGO}`),
      pool.query(`SELECT fn_gran_total_inventario() AS gran_total`),
    ])
    res.json({
      total_productos:        Number(total.rows[0].count),
      stock_critico:          Number(critico.rows[0].count),
      proximos_vencer:        Number(alertasVenc.rows[0].count),
      movimientos_hoy:        Number(movHoy.rows[0].count),
      ventas_hoy:             Number(ventasHoy.rows[0].total_ventas),
      mermas_hoy:             Number(mermasHoy.rows[0].total_mermas),
      descuentos_hoy:         Number(descuentosHoy.rows[0].total_descuentos),
      valor_total_inventario: Number(valorInventario.rows[0].gran_total),
    })
  } catch (err) { next(err) }
}

// GET /api/movimientos/valor-inventario
async function getValorInventario(req, res, next) {
  try {
    const mostrarInactivos = req.query.mostrar_inactivos === 'true'
    let query = `
      SELECT
        p.id, p.sku, p.codigo_barras, p.nombre, p.activo,
        c.nombre AS categoria_nombre,
        p.stock_actual, p.stock_minimo, p.unidad_medida,
        p.precio_unitario, p.precio_descuento,
        COALESCE(p.precio_descuento, p.precio_unitario) AS precio_vigente,
        p.stock_actual * COALESCE(p.precio_descuento, p.precio_unitario) AS valor_total_producto
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
    `
    if (!mostrarInactivos) {
      query += ` WHERE p.activo = true AND p.eliminado_at IS NULL`
    } else {
      query += ` WHERE p.eliminado_at IS NULL`
    }
    query += ` ORDER BY p.activo DESC, p.nombre ASC`

    const { rows } = await pool.query(query)
    const granTotal = rows
      .filter(r => r.activo)
      .reduce((acc, r) => acc + Number(r.valor_total_producto || 0), 0)
    res.json({ productos: rows, gran_total: granTotal })
  } catch (err) { next(err) }
}

// GET /api/movimientos/reporte-financiero
// Query params: periodo=hoy|semana|mes|custom, fecha_desde, fecha_hasta
async function getReporteFinanciero(req, res, next) {
  try {
    const { periodo = 'mes', fecha_desde, fecha_hasta } = req.query

    let desde, hasta
    switch (periodo) {
      case 'hoy':
        desde = `${HOY_SANTIAGO}`
        hasta = `NOW()`
        break
      case 'semana':
        desde = `DATE_TRUNC('week', NOW() AT TIME ZONE 'America/Santiago') AT TIME ZONE 'America/Santiago'`
        hasta = `NOW()`
        break
      case 'mes':
        desde = `DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Santiago') AT TIME ZONE 'America/Santiago'`
        hasta = `NOW()`
        break
      case 'custom':
        if (!fecha_desde || !fecha_hasta) {
          return res.status(400).json({ error: 'fecha_desde y fecha_hasta son requeridos para periodo custom' })
        }
        desde = `'${fecha_desde}'::timestamptz`
        hasta  = `'${fecha_hasta} 23:59:59'::timestamptz`
        break
      default:
        desde = `DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Santiago') AT TIME ZONE 'America/Santiago'`
        hasta = `NOW()`
    }

    const [ventas, mermas, descuentos, ajustes, movimientos] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(total), 0)    AS monto_total,
          COALESCE(SUM(cantidad), 0) AS unidades,
          COUNT(*)                   AS transacciones
        FROM movimientos
        WHERE tipo = 'SALIDA' AND motivo IN ('VENTA','TRASLADO')
          AND created_at >= ${desde} AND created_at <= ${hasta}
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(total), 0)    AS monto_total,
          COALESCE(SUM(cantidad), 0) AS unidades,
          COUNT(*)                   AS transacciones
        FROM movimientos
        WHERE tipo = 'SALIDA' AND motivo = 'MERMA'
          AND created_at >= ${desde} AND created_at <= ${hasta}
      `),
      pool.query(`
        SELECT COALESCE(SUM(descuento_monto), 0) AS monto_total
        FROM movimientos
        WHERE tipo = 'SALIDA' AND motivo = 'VENTA' AND descuento_monto > 0
          AND created_at >= ${desde} AND created_at <= ${hasta}
      `),
      pool.query(`
        SELECT COUNT(*) AS transacciones
        FROM movimientos
        WHERE motivo = 'AJUSTE'
          AND created_at >= ${desde} AND created_at <= ${hasta}
      `),
      // Detalle por día para el gráfico
      pool.query(`
        SELECT
          DATE_TRUNC('day', created_at AT TIME ZONE 'America/Santiago')::date AS fecha,
          SUM(CASE WHEN motivo IN ('VENTA','TRASLADO') THEN COALESCE(total,0) ELSE 0 END) AS ventas,
          SUM(CASE WHEN motivo = 'MERMA' THEN COALESCE(total,0) ELSE 0 END)              AS mermas,
          SUM(CASE WHEN motivo = 'VENTA' THEN COALESCE(descuento_monto,0) ELSE 0 END)   AS descuentos
        FROM movimientos
        WHERE tipo = 'SALIDA'
          AND created_at >= ${desde} AND created_at <= ${hasta}
        GROUP BY 1
        ORDER BY 1 ASC
      `),
    ])

    res.json({
      periodo,
      fecha_desde: desde,
      fecha_hasta: hasta,
      resumen: {
        ventas:      { monto: Number(ventas.rows[0].monto_total),      unidades: Number(ventas.rows[0].unidades),      transacciones: Number(ventas.rows[0].transacciones) },
        mermas:      { monto: Number(mermas.rows[0].monto_total),      unidades: Number(mermas.rows[0].unidades),      transacciones: Number(mermas.rows[0].transacciones) },
        descuentos:  { monto: Number(descuentos.rows[0].monto_total) },
        ajustes:     { transacciones: Number(ajustes.rows[0].transacciones) },
        neto:        Number(ventas.rows[0].monto_total) - Number(mermas.rows[0].monto_total),
      },
      detalle_diario: movimientos.rows.map(r => ({
        fecha:      r.fecha,
        ventas:     Number(r.ventas),
        mermas:     Number(r.mermas),
        descuentos: Number(r.descuentos),
      })),
    })
  } catch (err) { next(err) }
}

module.exports = {
  registrarEntrada, registrarSalida, registrarMerma,
  getLotesPorProducto, getMovimientos, getAlertas,
  getDashboardStats, getValorInventario, getReporteFinanciero,
}