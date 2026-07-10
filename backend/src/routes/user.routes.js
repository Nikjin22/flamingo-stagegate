const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth.middleware')
const requireRole = require('../middleware/role.middleware')
const {
  getAllUsers,
  getUserById,
  updateUser,
  deactivateUser,
  assignRole,
  removeRole
} = require('../controllers/user.controller')

router.use(protect)

router.get('/', getAllUsers)
router.get('/:id', getUserById)
router.patch('/:id', updateUser)
router.delete('/:id', requireRole(['Admin']), deactivateUser)
router.post('/:id/roles', requireRole(['Admin']), assignRole)
router.delete('/:id/roles/:roleId', requireRole(['Admin']), removeRole)

module.exports = router