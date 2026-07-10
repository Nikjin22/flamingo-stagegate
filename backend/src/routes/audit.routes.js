const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth.middleware')
const requireRole = require('../middleware/role.middleware')
const { getAuditLogs } = require('../controllers/audit.controller')

router.use(protect)
router.get('/', requireRole(['Admin']), getAuditLogs)

module.exports = router