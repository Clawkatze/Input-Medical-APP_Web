const router = require('express').Router()
const auth   = require('../middleware/auth')
const { requireRol } = require('../middleware/auth')
const ctrl   = require('../controllers/movimientosController')

router.use(auth)

// Todos pueden ver
router.get('/dashboard-stats',   ctrl.getDashboardStats)
router.get('/alertas',           ctrl.getAlertas)
router.get('/valor-inventario',  ctrl.getValorInventario)
router.get('/',                  ctrl.getMovimientos)

// Solo superadmin, admin y bodeguero pueden registrar movimientos
router.post('/entrada', requireRol('superadmin', 'admin', 'bodeguero'), ctrl.registrarEntrada)
router.post('/salida',  requireRol('superadmin', 'admin', 'bodeguero'), ctrl.registrarSalida)

module.exports = router
