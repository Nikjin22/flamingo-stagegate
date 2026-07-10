const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))
app.use(express.urlencoded({ extended: true }))

// Routes
const authRoutes = require('./routes/auth.routes')
app.use('/api/auth', authRoutes)
const userRoutes = require('./routes/user.routes')
app.use('/api/users', userRoutes)
const roleRoutes = require('./routes/role.routes')
app.use('/api/roles', roleRoutes)
const launchRoutes = require('./routes/launch.routes')
const audit = require('./middleware/audit.middleware')
app.use('/api/launches', launchRoutes)
const stageRoutes = require('./routes/stage.routes')
app.use('/api/launches/:launchId/stages', stageRoutes)
const taskRoutes = require('./routes/task.routes')
app.use('/api/launches/:launchId/tasks', taskRoutes)
const commentRoutes = require('./routes/comment.routes')
app.use('/api/launches/:launchId/comments', commentRoutes)
const notificationRoutes = require('./routes/notification.routes')
app.use('/api/notifications', notificationRoutes)
const readinessRoutes = require('./routes/readiness.routes')
app.use('/api/launches/:launchId/readiness', readinessRoutes)
const documentRoutes = require('./routes/document.routes')
app.use('/api/launches/:launchId/documents', documentRoutes)
const auditRoutes = require('./routes/audit.routes')
app.use('/api/audit', auditRoutes)

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Stage Gate API is running', status: 'ok' })
})

const os = require('os')
const getLocalIP = () => {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return 'localhost'
}

app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP()
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Accessible on your network at http://${ip}:${PORT}`)
})

// Run overdue task check every hour
const { checkOverdueTasks } = require('./services/overdueTask.service')
checkOverdueTasks() // Run once on startup
setInterval(checkOverdueTasks, 60 * 60 * 1000) // Then every hour