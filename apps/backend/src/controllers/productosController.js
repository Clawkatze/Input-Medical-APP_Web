const pool = require('../config/db')

// GET /api/productos
async function getAll(req, res, next) {
  const { busqueda } = req.query
  try {
    let query = `
      SELECT p.*, c.nombre AS categoria_nombre
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
  } catch (err) {
    next(err)
  }
}

// GET /api/productos/:id
async function getById(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       WHERE p.id = $1`,
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

// GET /api/productos/barcode/:codigo
async function getByBarcode(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.nombre AS categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       WHERE (p.codigo_barras = $1 OR p.sku = $1) AND p.activo = true`,
      [req.params.codigo]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

// POST /api/productos
async function create(req, res, next) {
  const {
    codigo_barras, sku, nombre, descripcion,
    categoria_id, stock_minimo, unidad_medida, tiene_vencimiento,
    numero_lote, fecha_vencimiento, cantidad_inicial
  } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Insertar producto con stock 0
    const { rows } = await client.query(
      `INSERT INTO productos (codigo_barras, sku, nombre, descripcion, categoria_id,
        stock_actual, stock_minimo, unidad_medida, tiene_vencimiento)
       VALUES ($1,$2,$3,$4,$5, 0,$6,$7,$8)
       RETURNING *`,
      [codigo_barras || null, sku, nombre, descripcion || null, categoria_id || null,
       stock_minimo || 10, unidad_medida || 'unidad', tiene_vencimiento ?? true]
    )
    const producto = rows[0]

    // Si se envió un lote inicial, registrar entrada
    if (numero_lote && cantidad_inicial && Number(cantidad_inicial) > 0) {
      await client.query(
        `SELECT fn_registrar_entrada($1,$2,$3,$4,$5,$6)`,
        [producto.id, numero_lote, fecha_vencimiento || null,
         Number(cantidad_inicial), 'Ingreso inicial', req.user.email]
      )
    }

    await client.query('COMMIT')
    res.status(201).json(producto)
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}

// PUT /api/productos/:id
async function update(req, res, next) {
  const {
    codigo_barras, sku, nombre, descripcion,
    categoria_id, stock_minimo, unidad_medida, tiene_vencimiento
  } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE productos
       SET codigo_barras=$1, sku=$2, nombre=$3, descripcion=$4,
           categoria_id=$5, stock_minimo=$6, unidad_medida=$7,
           tiene_vencimiento=$8, updated_at=NOW()
       WHERE id=$9 AND activo=true
       RETURNING *`,
      [codigo_barras || null, sku, nombre, descripcion || null,
       categoria_id || null, stock_minimo || 10, unidad_medida || 'unidad',
       tiene_vencimiento ?? true, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}

// DELETE /api/productos/:id  (soft delete)
async function remove(req, res, next) {
  try {
    const { rowCount } = await pool.query(
      'UPDATE productos SET activo=false, updated_at=NOW() WHERE id=$1',
      [req.params.id]
    )
    if (!rowCount) return res.status(404).json({ error: 'Producto no encontrado' })
    res.json({ message: 'Producto desactivado correctamente' })
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll, getById, getByBarcode, create, update, remove }
