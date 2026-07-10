const express = require('express')
const router = express.Router({ mergeParams: true })
const protect = require('../middleware/auth.middleware')
const requireRole = require('../middleware/role.middleware')
const {
  getTasksByLaunch,
  createTask,
  updateTask,
  deleteTask,
  bulkUpdateTasks,
  seedPharmaTask
} = require('../controllers/task.controller')

router.use(protect)

router.get('/', getTasksByLaunch)
router.post('/', requireRole(['Admin', 'Launch Manager', 'Team Member']), createTask)
router.post('/seed', seedPharmaTask)
router.patch('/bulk', bulkUpdateTasks)
router.patch('/:taskId', requireRole(['Admin', 'Launch Manager', 'Approver', 'Team Member']), updateTask)
router.delete('/:taskId', requireRole(['Admin', 'Launch Manager', 'Team Member']), deleteTask)

module.exports = router