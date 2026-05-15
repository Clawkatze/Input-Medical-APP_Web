const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' })
  }
  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

// Middleware de autorización por rol
// Uso: router.get('/ruta', auth, requireRol('superadmin', 'admin'), ctrl)
function requireRol(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' })
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' })
    }
    next()
  }
}

module.exports = authMiddleware
module.exports.requireRol = requireRol
