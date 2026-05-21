const router = require('express').Router()
const auth   = require('../middleware/auth')
const { requireRol } = require('../middleware/auth')
const ctrl   = require('../controllers/productosController')

router.use(auth)

router.get('/',                ctrl.getAll)
router.get('/barcode/:codigo', ctrl.getByBarcode)
router.get('/:id',             ctrl.getById)

router.post('/',    requireRol('superadmin', 'admin'), ctrl.create)
router.put('/:id',  requireRol('superadmin', 'admin'), ctrl.update)
router.delete('/:id', requireRol('superadmin', 'admin'), ctrl.remove)

module.exports = router
