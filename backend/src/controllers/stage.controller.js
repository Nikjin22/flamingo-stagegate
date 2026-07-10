const prisma = require('../config/db')

const getStagesByLaunch = async (req, res) => {
  try {
    const stages = await prisma.stage.findMany({
      where: { launchId: req.params.launchId },
      orderBy: { sequenceOrder: 'asc' },
      include: {
        tasks: {
          include: {
            assignee: { select: { id: true, fullName: true } }
          }
        },
        gateReviews: {
          orderBy: { submittedAt: 'desc' },
          include: {
            submitter: { select: { id: true, fullName: true } },
            approvers: {
              include: {
                user: { select: { id: true, fullName: true } }
              }
            }
          }
        }
      }
    })
    res.json(stages)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const updateStage = async (req, res) => {
  try {
    const { name, startDate, dueDate, status, completionPct, ownerId } = req.body
    const stage = await prisma.stage.update({
      where: { id: req.params.stageId },
      data: {
        name,
        startDate: startDate ? new Date(startDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status,
        completionPct,
        ownerId
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        entityType: 'Stage',
        entityId: stage.id,
        entityLabel: stage.name,
        eventType: 'UPDATE',
        newValue: req.body
      }
    })

    res.json({ message: 'Stage updated', stage })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const submitForReview = async (req, res) => {
  try {
    const { comments } = req.body
    const stage = await prisma.stage.findUnique({ where: { id: req.params.stageId } })
    if (!stage) return res.status(404).json({ message: 'Stage not found' })

    const existing = await prisma.gateReview.findFirst({
      where: { stageId: req.params.stageId, decision: 'Pending' }
    })
    if (existing) return res.status(400).json({ message: 'A pending review already exists for this stage' })

    const review = await prisma.gateReview.create({
      data: { stageId: req.params.stageId, submittedBy: req.userId, decision: 'Pending', comments }
    })

    await prisma.stage.update({
      where: { id: req.params.stageId },
      data: { status: 'Under Review' }
    })

    // Notify all approvers
    const approvers = await prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: { name: 'Approver' }
          }
        }
      }
    })

    for (const approver of approvers) {
      await prisma.notification.create({
        data: {
          userId: approver.id,
          type: 'GATE_PENDING',
          title: 'Gate review pending your approval',
          body: `Stage "${stage.name}" has been submitted for gate review`
        }
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        entityType: 'GateReview',
        entityId: req.params.stageId,
        entityLabel: stage.name,
        eventType: 'SUBMIT',
        newValue: { comments }
      }
    })

    res.status(201).json({ message: 'Stage submitted for review', review })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const approveGate = async (req, res) => {
  try {
    const { comments } = req.body
    const review = await prisma.gateReview.findFirst({
      where: { stageId: req.params.stageId, decision: 'Pending' },
      include: { stage: { include: { launch: { include: { stages: { orderBy: { sequenceOrder: 'asc' } } } } } } }
    })
    if (!review) return res.status(404).json({ message: 'No pending review found' })

    await prisma.gateReview.update({
      where: { id: review.id },
      data: { decision: 'Approved', comments, decidedAt: new Date() }
    })

    await prisma.stage.update({
      where: { id: req.params.stageId },
      data: { status: 'Completed', completionPct: 100 }
    })

    await prisma.task.updateMany({
      where: { stageId: req.params.stageId },
      data: { status: 'Completed', completionPct: 100 }
    })

    const stages = review.stage.launch.stages
    const currentIndex = stages.findIndex(s => s.id === req.params.stageId)
    if (currentIndex !== -1 && currentIndex + 1 < stages.length) {
      await prisma.stage.update({
        where: { id: stages[currentIndex + 1].id },
        data: { status: 'In Progress' }
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: req.userId, entityType: 'GateReview',
        entityId: req.params.stageId, eventType: 'APPROVE',
        entityLabel: review.stage.name,
        newValue: { comments }
      }
    })

    res.json({ message: 'Gate approved. Next stage is now In Progress.' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const rejectGate = async (req, res) => {
  try {
    const { comments } = req.body
    const review = await prisma.gateReview.findFirst({
      where: { stageId: req.params.stageId, decision: 'Pending' },
      include: { stage: true }
    })
    if (!review) return res.status(404).json({ message: 'No pending review found' })

    await prisma.gateReview.update({
      where: { id: review.id },
      data: { decision: 'Rejected', comments, decidedAt: new Date() }
    })

    await prisma.stage.update({
      where: { id: req.params.stageId },
      data: { status: 'In Progress' }
    })

    await prisma.auditLog.create({
      data: {
        userId: req.userId, entityType: 'GateReview',
        entityId: req.params.stageId, eventType: 'REJECT',
        entityLabel: review.stage?.name,
        newValue: { comments }
      }
    })

    res.json({ message: 'Gate rejected. Stage returned to In Progress.' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const requestChanges = async (req, res) => {
  try {
    const { comments } = req.body
    if (!comments) return res.status(400).json({ message: 'Comments are required when requesting changes' })

    const review = await prisma.gateReview.findFirst({
      where: { stageId: req.params.stageId, decision: 'Pending' },
      include: { stage: true }
    })
    if (!review) return res.status(404).json({ message: 'No pending review found' })

    await prisma.gateReview.update({
      where: { id: review.id },
      data: { decision: 'Changes Requested', comments, decidedAt: new Date() }
    })

    await prisma.stage.update({
      where: { id: req.params.stageId },
      data: { status: 'In Progress' }
    })

    await prisma.notification.create({
      data: {
        userId: review.submittedBy,
        type: 'CHANGES_REQUESTED',
        title: 'Changes requested on your gate submission',
        body: `An approver has requested changes: ${comments}`
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: req.userId, entityType: 'GateReview',
        entityId: req.params.stageId, eventType: 'CHANGES_REQUESTED',
        entityLabel: review.stage?.name,
        newValue: { comments }
      }
    })

    res.json({ message: 'Changes requested. Stage returned to In Progress.' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const getGateHistory = async (req, res) => {
  try {
    const history = await prisma.gateReview.findMany({
      where: { stageId: req.params.stageId },
      orderBy: { submittedAt: 'desc' },
      include: {
        submitter: { select: { id: true, fullName: true } },
        approvers: {
          include: { user: { select: { id: true, fullName: true } } }
        }
      }
    })
    res.json(history)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const reopenStage = async (req, res) => {
  try {
    const { comments } = req.body

    const review = await prisma.gateReview.findFirst({
      where: { stageId: req.params.stageId, decision: 'Approved' },
      orderBy: { decidedAt: 'desc' }
    })
    if (!review) return res.status(404).json({ message: 'No approved review found for this stage' })

    await prisma.gateReview.create({
      data: {
        stageId: req.params.stageId,
        submittedBy: req.userId,
        decision: 'Reopened',
        comments: comments || 'Stage reopened for rework',
        decidedAt: new Date()
      }
    })

    await prisma.stage.update({
      where: { id: req.params.stageId },
      data: { status: 'In Progress', completionPct: 0 }
    })

    await prisma.task.updateMany({
      where: { stageId: req.params.stageId },
      data: { status: 'Not Started', completionPct: 0 }
    })

    const currentStage = await prisma.stage.findUnique({
      where: { id: req.params.stageId },
      include: { launch: { include: { stages: { orderBy: { sequenceOrder: 'asc' } } } } }
    })

    const stages = currentStage.launch.stages
    const currentIndex = stages.findIndex(s => s.id === req.params.stageId)
    if (currentIndex !== -1 && currentIndex + 1 < stages.length) {
      const nextStage = stages[currentIndex + 1]
      if (nextStage.status === 'In Progress') {
        await prisma.stage.update({
          where: { id: nextStage.id },
          data: { status: 'Not Started' }
        })
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: req.userId, entityType: 'GateReview',
        entityId: req.params.stageId, eventType: 'REOPEN',
        entityLabel: currentStage.name,
        newValue: { comments }
      }
    })

    res.json({ message: 'Stage reopened successfully. All tasks reset to Not Started.' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

module.exports = {
  getStagesByLaunch,
  updateStage,
  submitForReview,
  approveGate,
  rejectGate,
  requestChanges,
  getGateHistory,
  reopenStage
}