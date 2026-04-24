const router = require('express').Router()
const auth   = require('../middleware/auth')
const ctrl   = require('../controllers/productosController')

router.use(auth) // Todas las rutas de productos requieren autenticación

router.get('/',                    ctrl.getAll)
router.get('/barcode/:codigo',     ctrl.getByBarcode)
router.get('/:id',                 ctrl.getById)
router.post('/',                   ctrl.create)
router.put('/:id',                 ctrl.update)
router.delete('/:id',              ctrl.remove)

module.exports = router
