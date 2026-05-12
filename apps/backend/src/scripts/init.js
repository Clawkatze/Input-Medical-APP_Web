const bcrypt = require('bcryptjs')
const pool   = require('../config/db')

// Se ejecuta al arrancar el backend.
// Si no hay usuarios en la BD, crea el superadmin con variables de entorno.
// Así nunca hay hashes hardcodeados en el SQL.
async function inicializarSuperAdmin() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM usuarios')
    if (Number(rows[0].count) > 0) return // Ya hay usuarios, no hacer nada

    const email    = process.env.SUPERADMIN_EMAIL    || 'admin@inputmedical.cl'
    const password = process.env.SUPERADMIN_PASSWORD || 'admin123'
    const nombre   = process.env.SUPERADMIN_NOMBRE   || 'Administrador'

    const hash = await bcrypt.hash(password, 10)

    await pool.query(
      `INSERT INTO usuarios (email, nombre, password_hash, rol)
       VALUES ($1, $2, $3, 'superadmin')
       ON CONFLICT (email) DO NOTHING`,
      [email, nombre, hash]
    )

    console.log(`✅ Super Admin creado: ${email}`)
    console.log(`   Contraseña: ${password}`)
    console.log(`   ⚠️  Cambia la contraseña después del primer ingreso`)
  } catch (err) {
    console.error('Error al inicializar super admin:', err.message)
  }
}

module.exports = inicializarSuperAdmin
