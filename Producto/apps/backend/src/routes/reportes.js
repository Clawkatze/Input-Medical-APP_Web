const router = require('express').Router()
const auth   = require('../middleware/auth')
const { requireRol } = require('../middleware/auth')
const ctrl   = require('../controllers/reportesController')

router.use(auth)
router.use(requireRol('superadmin', 'admin', 'visualizador'))

router.get('/stock',        ctrl.reporteStock)
router.get('/vencimientos', ctrl.reporteVencimientos)
router.get('/movimientos',  ctrl.reporteMovimientos)

module.exports = router
