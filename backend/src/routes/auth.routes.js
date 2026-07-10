const express = require('express')
const router = express.Router()
const { register, login, getMe, forgotPassword, resetPassword } = require('../controllers/auth.controller')
const protect = require('../middleware/auth.middleware')

const protect2 = require('../middleware/auth.middleware')
const requireRole = require('../middleware/role.middleware')
router.post('/register', protect2, requireRole(['Admin']), register)
router.post('/login', login)
router.get('/me', protect, getMe)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

module.exports = router