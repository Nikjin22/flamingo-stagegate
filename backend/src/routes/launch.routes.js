const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth.middleware')
const requireRole = require('../middleware/role.middleware')
const {
  getAllLaunches,
  getLaunchById,
  createLaunch,
  updateLaunch,
  archiveLaunch,
  cloneLaunch,
  getDashboardStats,
  deleteLaunch,
  getMyDashboard
} = require('../controllers/launch.controller')

router.use(protect)

router.get('/dashboard', getDashboardStats)
router.get('/dashboard/me', getMyDashboard)
router.get('/', getAllLaunches)
router.get('/:id', getLaunchById)
router.post('/', createLaunch)
router.patch('/:id', requireRole(['Admin', 'Launch Manager']), updateLaunch)
router.patch('/:id/archive', requireRole(['Admin', 'Launch Manager']), archiveLaunch)
router.post('/:id/clone', cloneLaunch)
router.delete('/:id', requireRole(['Admin']), deleteLaunch)

module.exports = router