const prisma = require('../config/db')

const getTasksByLaunch = async (req, res) => {
  try {
    const { status, assigneeId, stageId, priority } = req.query

    const filters = { launchId: req.params.launchId }
    if (status) filters.status = status
    if (assigneeId) filters.assigneeId = assigneeId
    if (stageId) filters.stageId = stageId
    if (priority) filters.priority = priority

    const tasks = await prisma.task.findMany({
      where: filters,
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
        stage: { select: { id: true, name: true } },
        dependsOn: { select: { id: true, name: true, status: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(tasks)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const createTask = async (req, res) => {
  try {
    const {
      name, description, stageId, assigneeId,
      priority, dueDate, dependsOnId
    } = req.body

    if (!name) return res.status(400).json({ message: 'Task name is required' })

    const task = await prisma.task.create({
      data: {
        launchId: req.params.launchId,
        name,
        description,
        stageId: stageId || null,
        assigneeId: assigneeId || null,
        priority: priority || 'Medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        dependsOnId: dependsOnId || null
      },
      include: {
        assignee: { select: { id: true, fullName: true } },
        stage: { select: { id: true, name: true } }
      }
    })

    // Create notification for assignee
    if (assigneeId) {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          type: 'TASK_ASSIGNED',
          title: 'New task assigned to you',
          body: `You have been assigned task: ${name}`
        }
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        entityType: 'Task',
        entityId: task.id,
        entityLabel: task.name,
        eventType: 'CREATE',
        newValue: { name: task.name, stageId: task.stageId, priority: task.priority }
      }
    })

    res.status(201).json({ message: 'Task created', task })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

const updateTask = async (req, res) => {
  try {
    const {
      name, description, assigneeId, priority,
      dueDate, status, completionPct, dependsOnId
    } = req.body

    const task = await prisma.task.update({
      where: { id: req.params.taskId },
      data: {
        name,
        description,
        assigneeId: assigneeId || null,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status,
        completionPct,
        dependsOnId: dependsOnId || null
      },
      include: {
        assignee: { select: { id: true, fullName: true } },
        stage: { select: { id: true, name: true } }
      }
    })
    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        entityType: 'Task',
        entityId: task.id,
        entityLabel: task.name,
        eventType: 'UPDATE',
        newValue: req.body
      }
    })

    res.json({ message: 'Task updated', task })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const deleteTask = async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } })
    if (!task) return res.status(404).json({ message: 'Task not found' })

    await prisma.task.delete({ where: { id: req.params.taskId } })

    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        entityType: 'Task',
        entityId: req.params.taskId,
        entityLabel: task.name,
        eventType: 'DELETE',
        newValue: { name: task.name }
      }
    })

    res.json({ message: 'Task deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

const bulkUpdateTasks = async (req, res) => {
  try {
    const { taskIds, status, assigneeId, priority } = req.body

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'taskIds array is required' })
    }

    const data = {}
    if (status) data.status = status
    if (assigneeId) data.assigneeId = assigneeId
    if (priority) data.priority = priority

    await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data
    })

    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        entityType: 'Task',
        entityId: taskIds.join(','),
        eventType: 'BULK_UPDATE',
        newValue: { taskCount: taskIds.length, ...data }
      }
    })

    res.json({ message: `${taskIds.length} tasks updated successfully` })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const seedPharmaTask = async (req, res) => {
  try {
    const { launchId } = req.params

    const launch = await prisma.launch.findUnique({
      where: { id: launchId },
      include: { stages: { orderBy: { sequenceOrder: 'asc' } } }
    })

    if (!launch) return res.status(404).json({ message: 'Launch not found' })

    const stageTasks = {
      'Idea': [
        { name: 'Product concept definition', priority: 'High' },
        { name: 'Initial market research for UK generic market', priority: 'High' },
        { name: 'Therapeutic area assessment', priority: 'Medium' },
        { name: 'Preliminary IP landscape review', priority: 'Medium' },
      ],
      'Business Case': [
        { name: 'UK market size and opportunity analysis', priority: 'High' },
        { name: 'Competitor pricing analysis', priority: 'High' },
        { name: 'Manufacturing cost estimation', priority: 'High' },
        { name: 'ROI and financial modelling', priority: 'Medium' },
        { name: 'Risk assessment report', priority: 'Medium' },
      ],
      'Development': [
        { name: 'API sourcing and supplier qualification', priority: 'High' },
        { name: 'Formulation development at Taloja facility', priority: 'High' },
        { name: 'Analytical method development', priority: 'High' },
        { name: 'Stability studies initiation (ICH guidelines)', priority: 'High' },
        { name: 'Excipient compatibility study', priority: 'Medium' },
        { name: 'Pilot batch manufacturing', priority: 'High' },
      ],
      'Validation': [
        { name: 'Process validation — 3 consecutive batches', priority: 'High' },
        { name: 'Cleaning validation', priority: 'High' },
        { name: 'Analytical method validation', priority: 'High' },
        { name: 'Accelerated stability data review', priority: 'High' },
        { name: 'GMP audit of manufacturing site', priority: 'High' },
        { name: 'MHRA dossier preparation (CTD format)', priority: 'High' },
      ],
      'Launch Readiness': [
        { name: 'MHRA Marketing Authorisation submission', priority: 'High' },
        { name: 'UK labelling and artwork approval', priority: 'High' },
        { name: 'UK import licence confirmation', priority: 'High' },
        { name: 'Batch certification by QP', priority: 'High' },
        { name: 'NHS Drug Tariff listing application', priority: 'High' },
        { name: 'Supply chain and 3PL setup in UK', priority: 'Medium' },
        { name: 'Sales team training', priority: 'Medium' },
        { name: 'Pharmacovigilance system setup', priority: 'High' },
      ],
      'Launch': [
        { name: 'First commercial batch release', priority: 'High' },
        { name: 'UK wholesaler distribution setup', priority: 'High' },
        { name: 'NHS and pharmacy customer communications', priority: 'Medium' },
        { name: 'Launch announcement to UK sales team', priority: 'Medium' },
      ],
      'Post Launch Review': [
        { name: 'Sales performance review — Month 1', priority: 'High' },
        { name: 'Adverse event monitoring report', priority: 'High' },
        { name: 'Customer feedback collection', priority: 'Medium' },
        { name: 'MHRA post-marketing surveillance report', priority: 'High' },
        { name: 'Lessons learned documentation', priority: 'Medium' },
      ]
    }

    let totalCreated = 0

    for (const stage of launch.stages) {
      const tasks = stageTasks[stage.name] || []
      for (const task of tasks) {
        await prisma.task.create({
          data: {
            launchId,
            stageId: stage.id,
            name: task.name,
            priority: task.priority,
            status: 'Not Started'
          }
        })
        totalCreated++
      }
    }

    res.json({ message: `${totalCreated} pharma tasks seeded successfully` })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

module.exports = {
  getTasksByLaunch,
  createTask,
  updateTask,
  deleteTask,
  bulkUpdateTasks,
  seedPharmaTask
}