const router  = require('express').Router()
const auth    = require('../middleware/auth')
const { requireRol } = require('../middleware/auth')
const ctrl    = require('../controllers/movimientosController')

router.use(auth)

router.get('/alertas',            ctrl.getAlertas)
router.get('/dashboard-stats',    ctrl.getDashboardStats)
router.get('/valor-inventario',   ctrl.getValorInventario)
router.get('/lotes/:producto_id', ctrl.getLotesPorProducto)
router.get('/reporte-financiero', ctrl.getReporteFinanciero)
router.get('/',                   ctrl.getMovimientos)

router.post('/entrada', requireRol('superadmin', 'admin', 'bodeguero'), ctrl.registrarEntrada)
router.post('/salida',  requireRol('superadmin', 'admin', 'bodeguero'), ctrl.registrarSalida)
router.post('/merma',   requireRol('superadmin', 'admin', 'bodeguero'), ctrl.registrarMerma)

module.exports = router