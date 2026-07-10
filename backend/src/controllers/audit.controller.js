const prisma = require('../config/db')

const getAuditLogs = async (req, res) => {
  try {
    const { entityType, eventType, userId, page = 1, limit = 50 } = req.query

    const filters = {}
    if (entityType) filters.entityType = entityType
    if (eventType) filters.eventType = eventType
    if (userId) filters.userId = userId

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: filters,
        include: {
          user: { select: { id: true, fullName: true, email: true } }
        },
        orderBy: { occurredAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.auditLog.count({ where: filters })
    ])

    // Resolve readable labels for each entity, grouped by type for efficiency
    const idsByType = {}
    logs.forEach(log => {
      if (!log.entityId) return
      // entityId can sometimes be a comma-separated list (bulk actions) — take the first one for lookup purposes
      const firstId = log.entityId.split(',')[0]
      if (!idsByType[log.entityType]) idsByType[log.entityType] = new Set()
      idsByType[log.entityType].add(firstId)
    })

    const labelMap = {} // `${entityType}:${id}` -> readable label

    if (idsByType['Launch']) {
      const rows = await prisma.launch.findMany({
        where: { id: { in: [...idsByType['Launch']] } },
        select: { id: true, productName: true, productCode: true }
      })
      rows.forEach(r => { labelMap[`Launch:${r.id}`] = `${r.productName} (${r.productCode})` })
    }

    if (idsByType['Task']) {
      const rows = await prisma.task.findMany({
        where: { id: { in: [...idsByType['Task']] } },
        select: { id: true, name: true, launch: { select: { productName: true } } }
      })
      rows.forEach(r => { labelMap[`Task:${r.id}`] = `${r.name} — ${r.launch?.productName || ''}` })
    }

    if (idsByType['Stage']) {
      const rows = await prisma.stage.findMany({
        where: { id: { in: [...idsByType['Stage']] } },
        select: { id: true, name: true, launch: { select: { productName: true } } }
      })
      rows.forEach(r => { labelMap[`Stage:${r.id}`] = `${r.name} — ${r.launch?.productName || ''}` })
    }

    if (idsByType['GateReview']) {
      // entityId for GateReview events is actually the stageId (per our controller code)
      const rows = await prisma.stage.findMany({
        where: { id: { in: [...idsByType['GateReview']] } },
        select: { id: true, name: true, launch: { select: { productName: true } } }
      })
      rows.forEach(r => { labelMap[`GateReview:${r.id}`] = `${r.name} — ${r.launch?.productName || ''}` })
    }

    if (idsByType['Document']) {
      const rows = await prisma.document.findMany({
        where: { id: { in: [...idsByType['Document']] } },
        select: { id: true, fileName: true, launch: { select: { productName: true } } }
      })
      rows.forEach(r => { labelMap[`Document:${r.id}`] = `${r.fileName} — ${r.launch?.productName || ''}` })
    }

    if (idsByType['Comment']) {
      const rows = await prisma.comment.findMany({
        where: { id: { in: [...idsByType['Comment']] } },
        select: { id: true, launch: { select: { productName: true } } }
      })
      rows.forEach(r => { labelMap[`Comment:${r.id}`] = `Comment on ${r.launch?.productName || ''}` })
    }

    if (idsByType['ReadinessAssessment']) {
      // entityId for bulk readiness saves is actually the launchId
      const rows = await prisma.launch.findMany({
        where: { id: { in: [...idsByType['ReadinessAssessment']] } },
        select: { id: true, productName: true }
      })
      rows.forEach(r => { labelMap[`ReadinessAssessment:${r.id}`] = r.productName })
    }

    if (idsByType['User']) {
      const rows = await prisma.user.findMany({
        where: { id: { in: [...idsByType['User']] } },
        select: { id: true, fullName: true }
      })
      rows.forEach(r => { labelMap[`User:${r.id}`] = r.fullName })
    }

    // Use the stored entityLabel where available (new entries); fall back to the
    // after-the-fact lookup for older entries created before this field existed
    const logsWithLabels = logs.map(log => {
      if (log.entityLabel) return log
      const firstId = log.entityId ? log.entityId.split(',')[0] : null
      const label = firstId ? labelMap[`${log.entityType}:${firstId}`] : null
      return { ...log, entityLabel: label || null }
    })

    res.json({
      logs: logsWithLabels,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

module.exports = { getAuditLogs }