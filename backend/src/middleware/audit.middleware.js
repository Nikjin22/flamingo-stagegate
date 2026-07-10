const prisma = require('../config/db')

const audit = (eventType, entityType) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res)

    res.json = async (data) => {
      try {
        if (res.statusCode < 400 && req.userId) {
          await prisma.auditLog.create({
            data: {
              userId: req.userId,
              entityType,
              entityId: req.params.id || req.params.launchId ||
                        req.params.stageId || req.params.taskId ||
                        data?.id || data?.launch?.id ||
                        data?.task?.id || data?.stage?.id || 'unknown',
              eventType,
              newValue: req.body || {},
              occurredAt: new Date()
            }
          })
        }
      } catch (err) {
        console.error('Audit log error:', err.message)
      }
      return originalJson(data)
    }
    next()
  }
}

module.exports = audit