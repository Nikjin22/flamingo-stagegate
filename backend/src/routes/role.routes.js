const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth.middleware')
const requireRole = require('../middleware/role.middleware')
const {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  seedDefaultRoles
} = require('../controllers/role.controller')

router.use(protect)

router.get('/', getAllRoles)
router.post('/', requireRole(['Admin']), createRole)
router.patch('/:id', requireRole(['Admin']), updateRole)
router.delete('/:id', requireRole(['Admin']), deleteRole)
router.post('/seed', seedDefaultRoles)

module.exports = router