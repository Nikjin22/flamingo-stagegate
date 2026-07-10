const prisma = require('../config/db')

// requireRole(['Admin', 'Approver']) → user must have at least one of these roles
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const userRoles = await prisma.userRole.findMany({
        where: { userId: req.userId },
        include: { role: true }
      })

      const roleNames = userRoles.map(ur => ur.role.name)
      req.userRoles = roleNames // attach for later use if needed

      const hasPermission = roleNames.some(r => allowedRoles.includes(r))

      if (!hasPermission) {
        return res.status(403).json({
          message: `Access denied. This action requires one of these roles: ${allowedRoles.join(', ')}`
        })
      }

      next()
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: 'Server error checking permissions' })
    }
  }
}

module.exports = requireRole