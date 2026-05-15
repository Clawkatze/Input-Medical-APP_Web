const pool   = require('../config/db')
const bcrypt = require('bcryptjs')

const ROLES_VALIDOS = ['superadmin', 'admin', 'bodeguero', 'visualizador']

// GET /api/usuarios
async function getAll(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, nombre, rol, activo, ultimo_acceso, created_at
       FROM usuarios ORDER BY created_at DESC`
    )
    res.json(rows)
  } catch (err) { next(err) }
}

// GET /api/usuarios/:id
async function getById(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, nombre, rol, activo, ultimo_acceso, created_at
       FROM usuarios WHERE id = $1`,
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(rows[0])
  } catch (err) { next(err) }
}

// POST /api/usuarios
async function create(req, res, next) {
  const { email, nombre, password, rol } = req.body

  if (!email || !nombre || !password || !rol) {
    return res.status(400).json({ error: 'email, nombre, password y rol son requeridos' })
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({ error: `Rol inválido. Debe ser: ${ROLES_VALIDOS.join(', ')}` })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  try {
    const hash = await bcrypt.hash(password, 10)
    const { rows } = await pool.query(
      `INSERT INTO usuarios (email, nombre, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, nombre, rol, activo, created_at`,
      [email, nombre, hash, rol]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' })
    }
    next(err)
  }
}

// PUT /api/usuarios/:id
async function update(req, res, next) {
  const { nombre, email, rol, activo } = req.body

  if (rol && !ROLES_VALIDOS.includes(rol)) {
    return res.status(400).json({ error: `Rol inválido. Debe ser: ${ROLES_VALIDOS.join(', ')}` })
  }

  // No permitir que un superadmin se quite su propio rol
  if (req.params.id === req.user.id && rol && rol !== 'superadmin') {
    return res.status(400).json({ error: 'No puedes cambiar tu propio rol de superadmin' })
  }

  try {
    const { rows } = await pool.query(
      `UPDATE usuarios
       SET nombre = COALESCE($1, nombre),
           email  = COALESCE($2, email),
           rol    = COALESCE($3, rol),
           activo = COALESCE($4, activo)
       WHERE id = $5
       RETURNING id, email, nombre, rol, activo, created_at`,
      [nombre || null, email || null, rol || null, activo ?? null, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' })
    }
    next(err)
  }
}

// PUT /api/usuarios/:id/password
async function changePassword(req, res, next) {
  const { password } = req.body
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }
  try {
    const hash = await bcrypt.hash(password, 10)
    const { rowCount } = await pool.query(
      'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
      [hash, req.params.id]
    )
    if (!rowCount) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json({ message: 'Contraseña actualizada correctamente' })
  } catch (err) { next(err) }
}

// DELETE /api/usuarios/:id (soft delete)
async function remove(req, res, next) {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' })
  }
  try {
    const { rowCount } = await pool.query(
      'UPDATE usuarios SET activo = false WHERE id = $1',
      [req.params.id]
    )
    if (!rowCount) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json({ message: 'Usuario desactivado correctamente' })
  } catch (err) { next(err) }
}

module.exports = { getAll, getById, create, update, changePassword, remove }
