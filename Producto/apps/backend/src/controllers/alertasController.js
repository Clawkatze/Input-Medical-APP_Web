const pool = require('../config/db')

// GET /api/alertas/count
async function getCount(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM lotes l
      JOIN productos p ON p.id = l.producto_id
      WHERE p.activo = true
        AND p.eliminado_at IS NULL
        AND l.cantidad_actual > 0
        AND l.fecha_vencimiento IS NOT NULL
        AND l.fecha_vencimiento <= CURRENT_DATE + (90 * INTERVAL '1 day')
        AND NOT EXISTS (
          SELECT 1 FROM alertas_revisadas ar
          WHERE ar.lote_id = l.id
            AND ar.fecha_revision::date = CURRENT_DATE
        )
    `)
    res.json({ total: rows[0].total })
  } catch (err) { next(err) }
}

// GET /api/alertas/pendientes
async function getPendientes(req, res, next) {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.id  AS producto_id,
        p.nombre,
        p.sku,
        l.id  AS lote_id,
        l.numero_lote,
        l.fecha_vencimiento,
        l.cantidad_actual,
        (l.fecha_vencimiento - CURRENT_DATE)::int AS dias_restantes
      FROM lotes l
      JOIN productos p ON p.id = l.producto_id
      WHERE p.activo = true
        AND p.eliminado_at IS NULL
        AND l.cantidad_actual > 0
        AND l.fecha_vencimiento IS NOT NULL
        AND l.fecha_vencimiento <= CURRENT_DATE + (90 * INTERVAL '1 day')
        AND NOT EXISTS (
          SELECT 1 FROM alertas_revisadas ar
          WHERE ar.lote_id = l.id
            AND ar.fecha_revision::date = CURRENT_DATE
        )
      ORDER BY l.fecha_vencimiento ASC
    `)
    res.json(rows)
  } catch (err) { next(err) }
}

// POST /api/alertas/revisar
async function marcarRevisadas(req, res, next) {
  const { alertas } = req.body
  if (!alertas || !alertas.length) {
    return res.status(400).json({ error: 'No hay alertas para marcar' })
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const a of alertas) {
      await client.query(`
        INSERT INTO alertas_revisadas (producto_id, lote_id, fecha_vencimiento, revisado_por)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [a.producto_id, a.lote_id || null, a.fecha_vencimiento || null, req.user?.id || null])
    }
    await client.query('COMMIT')
    res.json({ message: 'Alertas marcadas como revisadas', total: alertas.length })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}

module.exports = { getCount, getPendientes, marcarRevisadas }