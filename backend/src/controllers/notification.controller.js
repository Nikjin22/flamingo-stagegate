const prisma = require('../config/db')

const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const markAsRead = async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    })
    res.json({ message: 'Notification marked as read' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true }
    })
    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.userId, isRead: false }
    })
    res.json({ count })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

module.exports = { getNotifications, markAsRead, markAllAsRead, getUnreadCount }