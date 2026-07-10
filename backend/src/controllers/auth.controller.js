const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const prisma = require('../config/db')

const register = async (req, res) => {
  try {
    const { email, fullName, password } = req.body

    if (!email || !fullName || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { email, fullName, passwordHash }
    })

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, email: user.email, fullName: user.fullName }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const previousLogin = user.lastLogin

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'stagegate_secret_key',
      { expiresIn: '8h' }
    )

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        entityType: 'User',
        entityId: user.id,
        eventType: 'LOGIN',
        newValue: { email: user.email }
      }
    })

    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      include: { role: true }
    })
    const roleNames = userRoles.map(ur => ur.role.name)

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: roleNames,
        lastLogin: previousLogin,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, fullName: true, isActive: true, createdAt: true, lastLogin: true }
    })

    const userRoles = await prisma.userRole.findMany({
      where: { userId: req.userId },
      include: { role: true }
    })
    const roleNames = userRoles.map(ur => ur.role.name)

    res.json({ ...user, roles: roleNames })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required' })

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return res.json({ message: 'If this email exists, a reset token has been generated' })
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.user.update({
      where: { email },
      data: { resetToken, resetTokenExpiry }
    })

    res.json({
      message: 'Password reset token generated successfully',
      resetToken,
      note: 'Use this token to reset your password. Valid for 1 hour.'
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      }
    })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        entityType: 'User',
        entityId: user.id,
        eventType: 'PASSWORD_RESET',
        newValue: { email: user.email }
      }
    })

    res.json({ message: 'Password reset successfully. You can now login with your new password.' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

module.exports = { register, login, getMe, forgotPassword, resetPassword }