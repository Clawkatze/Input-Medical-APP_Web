const router = require('express').Router()
const auth   = require('../middleware/auth')
const { requireRol } = require('../middleware/auth')
const ctrl   = require('../controllers/usuariosController')

// Todas las rutas requieren estar autenticado Y ser superadmin
router.use(auth)
router.use(requireRol('superadmin'))

router.get('/',                   ctrl.getAll)
router.get('/:id',                ctrl.getById)
router.post('/',                  ctrl.create)
router.put('/:id',                ctrl.update)
router.put('/:id/password',       ctrl.changePassword)
router.delete('/:id',             ctrl.remove)

module.exports = router
