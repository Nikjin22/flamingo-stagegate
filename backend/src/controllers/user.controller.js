const prisma = require('../config/db')

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })
    res.json(users)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        userRoles: {
          include: { role: true }
        }
      }
    })
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const updateUser = async (req, res) => {
  try {
    const { fullName, email, isActive } = req.body
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { fullName, email, isActive },
      select: { id: true, email: true, fullName: true }
    })
    res.json({ message: 'User updated', user })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const deactivateUser = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false }
    })
    res.json({ message: 'User deactivated' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const assignRole = async (req, res) => {
  try {
    const { roleId } = req.body
    await prisma.userRole.create({
      data: { userId: req.params.id, roleId }
    })
    res.json({ message: 'Role assigned successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const removeRole = async (req, res) => {
  try {
    await prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId: req.params.id,
          roleId: req.params.roleId
        }
      }
    })
    res.json({ message: 'Role removed successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

module.exports = { getAllUsers, getUserById, updateUser, deactivateUser, assignRole, removeRole }