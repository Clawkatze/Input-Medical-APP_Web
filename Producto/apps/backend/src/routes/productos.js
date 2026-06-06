const router = require('express').Router()
const auth   = require('../middleware/auth')
const { requireRol } = require('../middleware/auth')
const ctrl   = require('../controllers/productosController')

router.use(auth)

router.get('/categorias',          ctrl.getCategorias)
router.get('/',                    ctrl.getAll)
router.get('/barcode/:codigo',     ctrl.getByBarcode)
router.get('/:id',                 ctrl.getById)

router.post('/',                   requireRol('superadmin', 'admin'), ctrl.create)
router.put('/:id',                 requireRol('superadmin', 'admin'), ctrl.update)
router.delete('/:id',              requireRol('superadmin', 'admin'), ctrl.remove)
router.put('/:id/reactivar',       requireRol('superadmin', 'admin'), ctrl.reactivar)
router.delete('/:id/permanente',   requireRol('superadmin', 'admin'), ctrl.eliminarPermanente)

module.exports = router
