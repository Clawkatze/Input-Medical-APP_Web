function errorHandler(err, req, res, next) {
  console.error('Error:', err.message)

  // Error de validación de express-validator
  if (err.type === 'validation') {
    return res.status(400).json({ error: err.message, details: err.details })
  }

  // Error de constraint de PostgreSQL (ej: unique violation)
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Ya existe un registro con ese valor (duplicado)' })
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referencia inválida: el registro relacionado no existe' })
  }

  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Error interno del servidor' })
}

module.exports = errorHandler
