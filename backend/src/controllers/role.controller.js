const prisma = require('../config/db')

const getAllRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: { permission: true }
        }
      }
    })
    res.json(roles)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const createRole = async (req, res) => {
  try {
    const { name, description } = req.body
    if (!name) return res.status(400).json({ message: 'Role name is required' })

    const existing = await prisma.role.findUnique({ where: { name } })
    if (existing) return res.status(400).json({ message: 'Role already exists' })

    const role = await prisma.role.create({
      data: { name, description }
    })
    res.status(201).json({ message: 'Role created', role })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const updateRole = async (req, res) => {
  try {
    const { name, description } = req.body
    const role = await prisma.role.update({
      where: { id: req.params.id },
      data: { name, description }
    })
    res.json({ message: 'Role updated', role })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const deleteRole = async (req, res) => {
  try {
    await prisma.role.delete({ where: { id: req.params.id } })
    res.json({ message: 'Role deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const seedDefaultRoles = async (req, res) => {
  try {
    const defaultRoles = [
      { name: 'Admin', description: 'Full system access' },
      { name: 'Launch Manager', description: 'Create and manage launches' },
      { name: 'Team Member', description: 'Update tasks and upload documents' },
      { name: 'Approver', description: 'Review and approve gate submissions' },
      { name: 'Executive Viewer', description: 'Read-only access to dashboards' },
    ]

    const created = []
    for (const r of defaultRoles) {
      const exists = await prisma.role.findUnique({ where: { name: r.name } })
      if (!exists) {
        const role = await prisma.role.create({ data: r })
        created.push(role.name)
      }
    }

    res.json({ message: 'Default roles seeded', created })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

module.exports = { getAllRoles, createRole, updateRole, deleteRole, seedDefaultRoles }