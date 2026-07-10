const prisma = require('../config/db')

const getComments = async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { launchId: req.params.launchId, parentId: null },
      include: {
        author: { select: { id: true, fullName: true } },
        replies: {
          include: {
            author: { select: { id: true, fullName: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(comments)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const addComment = async (req, res) => {
  try {
    const { body, parentId } = req.body
    if (!body) return res.status(400).json({ message: 'Comment body is required' })

    const comment = await prisma.comment.create({
      data: {
        launchId: req.params.launchId,
        authorId: req.userId,
        body,
        parentId: parentId || null
      },
      include: {
        author: { select: { id: true, fullName: true } }
      }
    })
    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        entityType: 'Comment',
        entityId: comment.id,
        entityLabel: body.length > 40 ? body.substring(0, 40) + '...' : body,
        eventType: 'CREATE',
        newValue: { launchId: req.params.launchId, isReply: !!parentId }
      }
    })

    res.status(201).json({ message: 'Comment added', comment })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

module.exports = { getComments, addComment }