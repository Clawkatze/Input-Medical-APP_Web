const router = require('express').Router()
const auth   = require('../middleware/auth')
const ctrl   = require('../controllers/movimientosController')

router.use(auth)

router.get('/',               ctrl.getMovimientos)
router.get('/alertas',        ctrl.getAlertas)
router.get('/dashboard-stats', ctrl.getDashboardStats)
router.post('/entrada',       ctrl.registrarEntrada)
router.post('/salida',        ctrl.registrarSalida)

module.exports = router
