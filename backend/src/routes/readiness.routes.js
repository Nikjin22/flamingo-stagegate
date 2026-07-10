const express = require('express')
const router = express.Router({ mergeParams: true })
const protect = require('../middleware/auth.middleware')
const {
  getReadiness,
  saveReadiness,
  bulkSaveReadiness
} = require('../controllers/readiness.controller')

router.use(protect)

router.get('/', getReadiness)
router.post('/', saveReadiness)
router.post('/bulk', bulkSaveReadiness)

module.exports = router