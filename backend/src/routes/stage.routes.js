const express = require('express')
const router = express.Router({ mergeParams: true })
const protect = require('../middleware/auth.middleware')
const requireRole = require('../middleware/role.middleware')
const {
  getStagesByLaunch,
  updateStage,
  submitForReview,
  approveGate,
  rejectGate,
  requestChanges,
  getGateHistory,
  reopenStage
} = require('../controllers/stage.controller')

router.use(protect)

router.get('/', getStagesByLaunch)
router.patch('/:stageId', requireRole(['Admin', 'Launch Manager']), updateStage)
router.post('/:stageId/submit', submitForReview)
router.post('/:stageId/approve', requireRole(['Admin', 'Approver']), approveGate)
router.post('/:stageId/reject', requireRole(['Admin', 'Approver']), rejectGate)
router.post('/:stageId/request-changes', requireRole(['Admin', 'Approver']), requestChanges)
router.post('/:stageId/reopen', requireRole(['Admin', 'Launch Manager']), reopenStage)
router.get('/:stageId/history', getGateHistory)

module.exports = router