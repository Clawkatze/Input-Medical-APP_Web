const router  = require('express').Router()
const auth    = require('../middleware/auth')
const ctrl    = require('../controllers/authController')

router.post('/login', ctrl.login)
router.get('/me',     auth, ctrl.me)

module.exports = router
