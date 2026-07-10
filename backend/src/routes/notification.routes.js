const express = require('express')
const router = express.Router()
const protect = require('../middleware/auth.middleware')
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
} = require('../controllers/notification.controller')

router.use(protect)

router.get('/', getNotifications)
router.get('/unread-count', getUnreadCount)
router.patch('/mark-all-read', markAllAsRead)
router.patch('/:id/read', markAsRead)

module.exports = router