const router = require('express').Router()
const auth   = require('../middleware/auth')
const ctrl   = require('../controllers/alertasController')

router.use(auth)

router.get('/count',      ctrl.getCount)
router.get('/pendientes', ctrl.getPendientes)
router.post('/revisar',   ctrl.marcarRevisadas)

module.exports = router
