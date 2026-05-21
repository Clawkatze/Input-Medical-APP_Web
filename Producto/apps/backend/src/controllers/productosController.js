const pool = require('../config/db')

async function getAll(req, res, next) {
  const { busqueda } = req.query
  try {
    let query = `
      SELECT p.*, c.nombre AS categoria_nombre,
             COALESCE(p.precio_descuento, p.precio_unitario) AS precio_vigente
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.activo = true
    `
    const params = []
    if (busqueda) {
      params.push(`%${busqueda}%`)
      query += ` AND (p.nombre ILIKE $1 OR p.sku ILIKE $1 OR p.codigo_barras ILIKE $1)`
    }
    query += ' ORDER BY p.nombre'
    const { rows } = await pool.query(query, params)
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
       WHERE (p.codigo_barras = $1 OR p.sku = $1) AND p.activo = true`,
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
      ) VALUES ($1,$2,$3,$4,$5, 0,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        codigo_barras || null, sku, nombre, descripcion || null, categoria_id || null,
        stock_minimo || 10, unidad_medida || 'unidad',
        tiene_vencimiento ?? true,
        precio_unitario || 0,
        precio_descuento || null
      ]
    )
    await client.query('COMMIT')
    res.status(201).json(rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
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
       WHERE id=$11 AND activo=true
       RETURNING *`,
      [
        codigo_barras || null, sku, nombre, descripcion || null,
        categoria_id || null, stock_minimo || 10, unidad_medida || 'unidad',
        tiene_vencimiento ?? true,
        precio_unitario || 0,
        precio_descuento || null,
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
      'UPDATE productos SET activo=false, updated_at=NOW() WHERE id=$1',
      [req.params.id]
    )
    if (!rowCount) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json({ message: 'Producto desactivado correctamente' })
  } catch (err) { next(err) }
}

module.exports = { getAll, getById, getByBarcode, create, update, remove }
