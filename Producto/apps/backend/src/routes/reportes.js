const router = require('express').Router()
const auth   = require('../middleware/auth')
const ctrl   = require('../controllers/reportesController')

router.use(auth)

router.get('/stock',       ctrl.reporteStock)
router.get('/vencimientos', ctrl.reporteVencimientos)
router.get('/movimientos', ctrl.reporteMovimientos)
router.get('/financiero',  ctrl.reporteFinanciero)

module.exports = router