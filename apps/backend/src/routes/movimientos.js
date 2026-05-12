const router = require('express').Router()
const auth   = require('../middleware/auth')
const ctrl   = require('../controllers/movimientosController')

router.use(auth)

router.get('/dashboard-stats',   ctrl.getDashboardStats)
router.get('/alertas',           ctrl.getAlertas)
router.get('/valor-inventario',  ctrl.getValorInventario)
router.get('/',                  ctrl.getMovimientos)
router.post('/entrada',          ctrl.registrarEntrada)
router.post('/salida',           ctrl.registrarSalida)

module.exports = router
