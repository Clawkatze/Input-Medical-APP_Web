const pool = require('../config/db')

async function getAll(req, res, next) {
  const { busqueda, mostrar_inactivos } = req.query
  try {
    let query = `
      SELECT p.*, c.nombre AS categoria_nombre,
             COALESCE(p.precio_descuento, p.precio_unitario) AS precio_vigente
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.eliminado_at IS NULL
    `
    const params = []
    if (mostrar_inactivos !== 'true') query += ` AND p.activo = true`
    if (busqueda) {
      params.push(`%${busqueda}%`)
      query += ` AND (p.nombre ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.codigo_barras ILIKE $${params.length})`
    }
    query += ' ORDER BY p.activo DESC, p.nombre ASC'
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (err) { next(err) }
}

async function getCategorias(req, res, next) {
  try {
    const { rows } = await pool.query(`SELECT id, nombre FROM categorias ORDER BY nombre ASC`)
    res.json(rows)
  } catch (err) { next(err) }
}

async function getById(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre,
              COALESCE(p.precio_descuento, p.precio_unitario) AS precio_vigente
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       WHERE p.id = $1`,
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json(rows[0])
  } catch (err) { next(err) }
}

async function getByBarcode(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre,
              COALESCE(p.precio_descuento, p.precio_unitario) AS precio_vigente
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       WHERE (p.codigo_barras = $1 OR p.sku = $1) AND p.activo = true AND p.eliminado_at IS NULL`,
      [req.params.codigo]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json(rows[0])
  } catch (err) { next(err) }
}

async function create(req, res, next) {
  const {
    codigo_barras, sku, nombre, descripcion,
    categoria_id, stock_minimo, unidad_medida,
    tiene_vencimiento, precio_unitario, precio_descuento
  } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO productos (
        codigo_barras, sku, nombre, descripcion, categoria_id,
        stock_actual, stock_minimo, unidad_medida, tiene_vencimiento,
        precio_unitario, precio_descuento
      ) VALUES ($1,$2,$3,$4,$5, 0,$6,$7,$8,$9,$10) RETURNING *`,
      [
        codigo_barras || null, sku, nombre, descripcion || null, categoria_id || null,
        stock_minimo || 10, unidad_medida || 'unidad',
        tiene_vencimiento ?? true, precio_unitario || 0, precio_descuento || null
      ]
    )
    await client.query('COMMIT')
    res.status(201).json(rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally { client.release() }
}

async function update(req, res, next) {
  const {
    codigo_barras, sku, nombre, descripcion,
    categoria_id, stock_minimo, unidad_medida,
    tiene_vencimiento, precio_unitario, precio_descuento
  } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE productos
       SET codigo_barras=$1, sku=$2, nombre=$3, descripcion=$4,
           categoria_id=$5, stock_minimo=$6, unidad_medida=$7,
           tiene_vencimiento=$8, precio_unitario=$9, precio_descuento=$10,
           updated_at=NOW()
       WHERE id=$11 AND eliminado_at IS NULL RETURNING *`,
      [
        codigo_barras || null, sku, nombre, descripcion || null,
        categoria_id || null, stock_minimo || 10, unidad_medida || 'unidad',
        tiene_vencimiento ?? true, precio_unitario || 0, precio_descuento || null,
        req.params.id
      ]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json(rows[0])
  } catch (err) { next(err) }
}

async function remove(req, res, next) {
  try {
    const { rowCount } = await pool.query(
      'UPDATE productos SET activo=false, updated_at=NOW() WHERE id=$1 AND eliminado_at IS NULL',
      [req.params.id]
    )
    if (!rowCount) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json({ message: 'Producto desactivado correctamente' })
  } catch (err) { next(err) }
}

async function reactivar(req, res, next) {
  try {
    const { rowCount } = await pool.query(
      'UPDATE productos SET activo=true, updated_at=NOW() WHERE id=$1 AND eliminado_at IS NULL',
      [req.params.id]
    )
    if (!rowCount) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json({ message: 'Producto reactivado correctamente' })
  } catch (err) { next(err) }
}

async function eliminarPermanente(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id, activo, eliminado_at FROM productos WHERE id=$1',
      [req.params.id]
    )
    if (!rows[0])            return res.status(404).json({ error: 'Producto no encontrado' })
    if (rows[0].activo)      return res.status(400).json({ error: 'El producto debe estar desactivado antes de eliminarlo permanentemente' })
    if (rows[0].eliminado_at) return res.status(400).json({ error: 'El producto ya fue eliminado permanentemente' })

    // Pasa el email del usuario para registrarlo en el evento del Kardex
    await pool.query('SELECT fn_eliminar_producto($1, $2)', [req.params.id, req.user.email])
    res.json({ message: 'Producto eliminado permanentemente. El historial de movimientos se conserva.' })
  } catch (err) { next(err) }
}

module.exports = {
  getAll, getCategorias, getById, getByBarcode,
  create, update, remove, reactivar, eliminarPermanente
}
