const prisma = require('../config/db')

const checkOverdueTasks = async () => {
  try {
    const overdueTasks = await prisma.task.findMany({
      where: {
        status: { notIn: ['Completed'] },
        dueDate: { lt: new Date() },
      },
      include: {
        assignee: true,
        launch: { select: { productName: true } }
      }
    })

    for (const task of overdueTasks) {
      if (!task.assigneeId) continue

      // Check if we already sent this notification today
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const existing = await prisma.notification.findFirst({
        where: {
          userId: task.assigneeId,
          type: 'TASK_OVERDUE',
          body: { contains: task.id },
          createdAt: { gte: today }
        }
      })

      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: task.assigneeId,
            type: 'TASK_OVERDUE',
            title: 'Task overdue',
            body: `Task "${task.name}" in ${task.launch?.productName} is overdue. Task ID: ${task.id}`
          }
        })
      }
    }

    console.log(`Overdue task check complete — ${overdueTasks.length} overdue tasks found`)
  } catch (error) {
    console.error('Overdue task check error:', error.message)
  }
}

module.exports = { checkOverdueTasks }