const pool    = require('../config/db')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')

// POST /api/auth/login
async function login(req, res, next) {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' })
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
      [email]
    )
    const user = rows[0]
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' })

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )

    // Actualizar último acceso
    await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1', [user.id])

    res.json({
      token,
      user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol }
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/auth/me
async function me(req, res) {
  res.json({ user: req.user })
}

module.exports = { login, me }
