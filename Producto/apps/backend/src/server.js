require('dotenv').config()
const express             = require('express')
const cors                = require('cors')
const errorHandler        = require('./middleware/errorHandler')
const inicializarSuperAdmin = require('./scripts/init')

const app = express()

// ─── Middlewares globales ─────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'))
app.use('/api/usuarios',    require('./routes/usuarios'))
app.use('/api/productos',   require('./routes/productos'))
app.use('/api/movimientos', require('./routes/movimientos'))
app.use('/api/reportes',    require('./routes/reportes'))

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }))

// ─── Ruta no encontrada ───────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }))

// ─── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler)

// ─── Iniciar servidor ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000
app.listen(PORT, async () => {
  console.log(`🚀 Backend corriendo en http://localhost:${PORT}`)
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`)
  // Crear superadmin si no existe
  await inicializarSuperAdmin()
})
