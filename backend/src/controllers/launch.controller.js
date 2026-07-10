const prisma = require('../config/db')

const getAllLaunches = async (req, res) => {
  try {
    const { status, businessUnit, region, priority } = req.query

    const filters = {}
    if (status) filters.status = status
    if (businessUnit) filters.businessUnit = businessUnit
    if (region) filters.region = region
    if (priority) filters.priority = priority

    const launches = await prisma.launch.findMany({
      where: filters,
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        manager: { select: { id: true, fullName: true, email: true } },
        stages: true,
        _count: { select: { tasks: true, documents: true, comments: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(launches)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

const getLaunchById = async (req, res) => {
  try {
    const launch = await prisma.launch.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        manager: { select: { id: true, fullName: true, email: true } },
        stages: {
          orderBy: { sequenceOrder: 'asc' },
          include: {
            tasks: true,
            gateReviews: {
              include: {
                approvers: {
                  include: { user: { select: { id: true, fullName: true } } }
                }
              }
            }
          }
        },
        tasks: {
          include: {
            assignee: { select: { id: true, fullName: true } }
          }
        },
        assessments: true,
        _count: { select: { documents: true, comments: true } }
      }
    })
    if (!launch) return res.status(404).json({ message: 'Launch not found' })
    res.json(launch)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const createLaunch = async (req, res) => {
  try {
    const {
      productName, productCode, category, businessUnit,
      region, ownerId, managerId, targetLaunchDate,
      priority, description
    } = req.body

    if (!productName || !productCode) {
      return res.status(400).json({ message: 'Product name and code are required' })
    }

    const launch = await prisma.launch.create({
      data: {
        productName,
        productCode,
        category,
        businessUnit,
        region,
        ownerId: ownerId || req.userId,
        managerId: managerId || req.userId,
        targetLaunchDate: targetLaunchDate ? new Date(targetLaunchDate) : null,
        priority: priority || 'Medium',
        description
      }
    })

    // Auto-create default stages
    const defaultStages = [
      'Idea',
      'Business Case',
      'Development',
      'Validation',
      'Launch Readiness',
      'Launch',
      'Post Launch Review'
    ]

    for (let i = 0; i < defaultStages.length; i++) {
      await prisma.stage.create({
        data: {
          launchId: launch.id,
          name: defaultStages[i],
          sequenceOrder: i + 1,
          status: i === 0 ? 'In Progress' : 'Not Started'
        }
      })
    }

    const fullLaunch = await prisma.launch.findUnique({
      where: { id: launch.id },
      include: { stages: { orderBy: { sequenceOrder: 'asc' } } }
    })

    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        entityType: 'Launch',
        entityId: fullLaunch.id,
        entityLabel: `${fullLaunch.productName} (${fullLaunch.productCode})`,
        eventType: 'CREATE',
        newValue: { productName: fullLaunch.productName, productCode: fullLaunch.productCode }
      }
    })
    res.status(201).json({ message: 'Launch created successfully', launch: fullLaunch })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

const updateLaunch = async (req, res) => {
  try {
    const {
      productName, category, businessUnit, region,
      targetLaunchDate, actualLaunchDate, priority, status, description
    } = req.body

    const launch = await prisma.launch.update({
      where: { id: req.params.id },
      data: {
        productName,
        category,
        businessUnit,
        region,
        targetLaunchDate: targetLaunchDate ? new Date(targetLaunchDate) : undefined,
        actualLaunchDate: actualLaunchDate ? new Date(actualLaunchDate) : undefined,
        priority,
        status,
        description
      }
    })
    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        entityType: 'Launch',
        entityId: req.params.id,
        entityLabel: launch.productName,
        eventType: 'UPDATE',
        newValue: req.body
      }
    })
    res.json({ message: 'Launch updated', launch })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const archiveLaunch = async (req, res) => {
  try {
    const launch = await prisma.launch.update({
      where: { id: req.params.id },
      data: { status: 'Archived' }
    })

    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        entityType: 'Launch',
        entityId: launch.id,
        entityLabel: `${launch.productName} (${launch.productCode})`,
        eventType: 'ARCHIVE',
        newValue: { status: 'Archived' }
      }
    })

    res.json({ message: 'Launch archived' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const cloneLaunch = async (req, res) => {
  try {
    const original = await prisma.launch.findUnique({
      where: { id: req.params.id },
      include: { stages: { orderBy: { sequenceOrder: 'asc' } } }
    })

    if (!original) return res.status(404).json({ message: 'Launch not found' })

    const cloned = await prisma.launch.create({
      data: {
        productName: original.productName + ' (Copy)',
        productCode: original.productCode + '-COPY-' + Date.now(),
        category: original.category,
        businessUnit: original.businessUnit,
        region: original.region,
        ownerId: req.userId,
        managerId: req.userId,
        priority: original.priority,
        description: original.description,
        status: 'Draft'
      }
    })

    for (const stage of original.stages) {
      await prisma.stage.create({
        data: {
          launchId: cloned.id,
          name: stage.name,
          sequenceOrder: stage.sequenceOrder,
          status: 'Not Started'
        }
      })
    }

    res.status(201).json({ message: 'Launch cloned successfully', launch: cloned })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const getDashboardStats = async (req, res) => {
  try {
    const [total, active, completed, delayed, archived] = await Promise.all([
      prisma.launch.count(),
      prisma.launch.count({ where: { status: 'Active' } }),
      prisma.launch.count({ where: { status: 'Completed' } }),
      prisma.launch.count({ where: { status: 'Delayed' } }),
      prisma.launch.count({ where: { status: 'Archived' } }),
    ])

    const overdueTasks = await prisma.task.count({
      where: {
        status: { not: 'Completed' },
        dueDate: { lt: new Date() }
      }
    })

    const pendingApprovals = await prisma.gateReview.count({
      where: { decision: 'Pending' }
    })

    // Upcoming launches — target date within next 90 days
    const upcoming = await prisma.launch.count({
      where: {
        status: { notIn: ['Completed', 'Archived'] },
        targetLaunchDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        }
      }
    })

    // Monthly launch trends — last 6 months
    const monthlyTrends = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const year = date.getFullYear()
      const month = date.getMonth()
      const start = new Date(year, month, 1)
      const end = new Date(year, month + 1, 0)
      const count = await prisma.launch.count({
        where: { createdAt: { gte: start, lte: end } }
      })
      monthlyTrends.push({
        month: start.toLocaleString('en-GB', { month: 'short', year: '2-digit' }),
        count
      })
    }

    // Risk indicators — launches with overdue tasks or overdue stages
    const allActiveLaunches = await prisma.launch.findMany({
      where: { status: { notIn: ['Completed', 'Archived'] } },
      include: {
        stages: true,
        tasks: true,
        assessments: {
          orderBy: { assessedAt: 'desc' },
          take: 6
        }
      }
    })

    const riskLaunches = allActiveLaunches.map(launch => {
      const overdueTaskCount = launch.tasks.filter(t =>
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed'
      ).length

      const overdueStageCount = launch.stages.filter(s =>
        s.dueDate && new Date(s.dueDate) < new Date() && s.status !== 'Completed'
      ).length

      // Calculate readiness score
      const categoryScores = {}
      launch.assessments.forEach(a => {
        if (!categoryScores[a.category]) categoryScores[a.category] = a.score
      })
      const scores = Object.values(categoryScores)
      const avgReadiness = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null

      let riskLevel = 'Low'
      let riskReasons = []

      if (overdueTaskCount > 5) { riskLevel = 'High'; riskReasons.push(`${overdueTaskCount} overdue tasks`) }
      else if (overdueTaskCount > 0) { riskLevel = riskLevel === 'Low' ? 'Medium' : riskLevel; riskReasons.push(`${overdueTaskCount} overdue tasks`) }

      if (overdueStageCount > 0) { riskLevel = 'High'; riskReasons.push(`${overdueStageCount} overdue stages`) }

      if (avgReadiness !== null && avgReadiness < 40) { riskLevel = 'High'; riskReasons.push(`Low readiness ${avgReadiness}%`) }
      else if (avgReadiness !== null && avgReadiness < 60) { riskLevel = riskLevel === 'Low' ? 'Medium' : riskLevel; riskReasons.push(`Readiness at ${avgReadiness}%`) }

      return {
        id: launch.id,
        productName: launch.productName,
        productCode: launch.productCode,
        riskLevel,
        riskReasons,
        overdueTaskCount,
        overdueStageCount,
        avgReadiness
      }
    }).filter(l => l.riskLevel !== 'Low')
      .sort((a, b) => {
        const order = { High: 0, Medium: 1, Low: 2 }
        return order[a.riskLevel] - order[b.riskLevel]
      })

    res.json({
      total,
      active,
      completed,
      delayed,
      archived,
      overdueTasks,
      pendingApprovals,
      upcoming,
      monthlyTrends,
      riskLaunches
    })
    
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const deleteLaunch = async (req, res) => {
  try {
    const launch = await prisma.launch.findUnique({
      where: { id: req.params.id }
    })
    if (!launch) return res.status(404).json({ message: 'Launch not found' })

    // Note: we deliberately do NOT delete audit logs for this launch.
    // Audit history must survive even after the record itself is deleted,
    // so there's a permanent trail of what happened.
    await prisma.notification.deleteMany({ where: { userId: req.userId } })
    await prisma.readinessAssessment.deleteMany({ where: { launchId: req.params.id } })
    await prisma.comment.deleteMany({ where: { launchId: req.params.id } })
    await prisma.document.deleteMany({ where: { launchId: req.params.id } })
    await prisma.task.deleteMany({ where: { launchId: req.params.id } })

    // Delete gate approvers and reviews per stage
    const stages = await prisma.stage.findMany({ where: { launchId: req.params.id } })
    for (const stage of stages) {
      const reviews = await prisma.gateReview.findMany({ where: { stageId: stage.id } })
      for (const review of reviews) {
        await prisma.gateApprover.deleteMany({ where: { gateReviewId: review.id } })
      }
      await prisma.gateReview.deleteMany({ where: { stageId: stage.id } })
    }
    await prisma.stage.deleteMany({ where: { launchId: req.params.id } })
    await prisma.launch.delete({ where: { id: req.params.id } })

    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        entityType: 'Launch',
        entityId: req.params.id,
        entityLabel: `${launch.productName} (${launch.productCode})`,
        eventType: 'DELETE',
        newValue: { productName: launch.productName, productCode: launch.productCode }
      }
    })

    res.json({ message: 'Launch deleted successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

const getMyDashboard = async (req, res) => {
  try {
    const userRoles = await prisma.userRole.findMany({
      where: { userId: req.userId },
      include: { role: true }
    })
    const roleNames = userRoles.map(ur => ur.role.name)
    const isAdmin = roleNames.includes('Admin')
    const isExecViewer = roleNames.includes('Executive Viewer') && !isAdmin
    const isApprover = roleNames.includes('Approver')
    const isLaunchManager = roleNames.includes('Launch Manager')
    const isTeamMember = roleNames.includes('Team Member')

    const allLaunches = await prisma.launch.findMany({
      where: { status: { notIn: ['Archived'] } },
      include: {
        stages: { include: { tasks: true, gateReviews: { where: { decision: 'Pending' } } } },
        tasks: { include: { assignee: true } },
        assessments: true
      }
    })

    const now = new Date()

    // Pending gate approvals (relevant to Approver/Admin)
    const pendingApprovals = []
    allLaunches.forEach(l => {
      l.stages.forEach(s => {
        if (s.gateReviews.length > 0) {
          pendingApprovals.push({
            launchId: l.id, launchName: l.productName, productCode: l.productCode,
            stageId: s.id, stageName: s.name
          })
        }
      })
    })

    // Overdue tasks, optionally filtered to "my tasks" for Team Member
    let overdueTasksRaw = allLaunches.flatMap(l =>
      l.tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Completed')
        .map(t => ({ ...t, launchName: l.productName, launchId: l.id }))
    )
    if (isTeamMember && !isAdmin && !isLaunchManager) {
      overdueTasksRaw = overdueTasksRaw.filter(t => t.assigneeId === req.userId)
    }

    // My tasks due soon (Team Member focus) — next 7 days, not overdue
    const myTasksDueSoon = allLaunches.flatMap(l =>
      l.tasks.filter(t =>
        t.assigneeId === req.userId && t.status !== 'Completed' && t.dueDate &&
        new Date(t.dueDate) >= now && new Date(t.dueDate) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      ).map(t => ({ ...t, launchName: l.productName, launchId: l.id }))
    )

    // Risk calculation (reused logic)
    const riskLaunches = allLaunches.map(launch => {
      const overdueTaskCount = launch.tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Completed').length
      const overdueStageCount = launch.stages.filter(s => s.dueDate && new Date(s.dueDate) < now && s.status !== 'Completed').length
      const categoryScores = {}
      launch.assessments.forEach(a => { if (!categoryScores[a.category]) categoryScores[a.category] = a.score })
      const scores = Object.values(categoryScores)
      const avgReadiness = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

      let riskLevel = 'Low'
      const riskReasons = []
      if (overdueTaskCount > 5) { riskLevel = 'High'; riskReasons.push(`${overdueTaskCount} overdue tasks`) }
      else if (overdueTaskCount > 0) { riskLevel = riskLevel === 'Low' ? 'Medium' : riskLevel; riskReasons.push(`${overdueTaskCount} overdue tasks`) }
      if (overdueStageCount > 0) { riskLevel = 'High'; riskReasons.push(`${overdueStageCount} overdue stages`) }
      if (avgReadiness !== null && avgReadiness < 40) { riskLevel = 'High'; riskReasons.push(`Low readiness ${avgReadiness}%`) }
      else if (avgReadiness !== null && avgReadiness < 60) { riskLevel = riskLevel === 'Low' ? 'Medium' : riskLevel; riskReasons.push(`Readiness at ${avgReadiness}%`) }

      const activeStage = launch.stages.find(s => s.status === 'In Progress')
      const completedStages = launch.stages.filter(s => s.status === 'Completed').length

      return {
        id: launch.id, productName: launch.productName, productCode: launch.productCode,
        status: launch.status, riskLevel, riskReasons,
        currentStage: activeStage?.name || 'Not started',
        progress: launch.stages.length > 0 ? Math.round((completedStages / launch.stages.length) * 100) : 0
      }
    })

    const upcoming90 = allLaunches.filter(l =>
      l.targetLaunchDate && new Date(l.targetLaunchDate) >= now &&
      new Date(l.targetLaunchDate) <= new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) &&
      l.status !== 'Completed'
    )

    res.json({
      role: isAdmin ? 'Admin' : isExecViewer ? 'Executive Viewer' : isApprover ? 'Approver' : isLaunchManager ? 'Launch Manager' : 'Team Member',
      totals: {
        total: allLaunches.length,
        active: allLaunches.filter(l => l.status === 'Active').length,
        completed: allLaunches.filter(l => l.status === 'Completed').length,
        delayed: allLaunches.filter(l => l.status === 'Delayed').length,
      },
      pendingApprovals,
      overdueTasks: overdueTasksRaw,
      myTasksDueSoon,
      riskLaunches: riskLaunches.filter(l => l.riskLevel !== 'Low'),
      allLaunchesSummary: riskLaunches,
      upcomingCount: upcoming90.length
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

module.exports = {
  getAllLaunches,
  getLaunchById,
  createLaunch,
  updateLaunch,
  archiveLaunch,
  cloneLaunch,
  getDashboardStats,
  deleteLaunch,
  getMyDashboard
}