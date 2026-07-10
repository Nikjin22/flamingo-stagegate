const prisma = require('../config/db')

const getReadiness = async (req, res) => {
  try {
    const assessments = await prisma.readinessAssessment.findMany({
      where: { launchId: req.params.launchId },
      include: {
        assessor: { select: { id: true, fullName: true } }
      },
      orderBy: { assessedAt: 'desc' }
    })

    // Calculate scores per category
    const categories = [
      'Regulatory', 'Manufacturing', 'Supply Chain',
      'Commercial', 'Marketing', 'Training'
    ]

    const categoryScores = categories.map(cat => {
      const catAssessments = assessments.filter(a => a.category === cat)
      const latest = catAssessments[0]
      return {
        category: cat,
        score: latest?.score || 0,
        assessedBy: latest?.assessor?.fullName || null,
        assessedAt: latest?.assessedAt || null
      }
    })

    const overallScore = categoryScores.length > 0
      ? Math.round(categoryScores.reduce((sum, c) => sum + c.score, 0) / categoryScores.length)
      : 0

    res.json({ categoryScores, overallScore, assessments })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const saveReadiness = async (req, res) => {
  try {
    const { category, score } = req.body

    if (!category || score === undefined) {
      return res.status(400).json({ message: 'Category and score are required' })
    }

    if (score < 0 || score > 100) {
      return res.status(400).json({ message: 'Score must be between 0 and 100' })
    }

    const assessment = await prisma.readinessAssessment.create({
      data: {
        launchId: req.params.launchId,
        category,
        score: parseInt(score),
        assessedBy: req.userId
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        entityType: 'ReadinessAssessment',
        entityId: assessment.id,
        entityLabel: `${assessment.category} (${assessment.score}%)`,
        eventType: 'CREATE',
        newValue: { category: assessment.category, score: assessment.score }
      }
    })

    res.status(201).json({ message: 'Readiness score saved', assessment })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const bulkSaveReadiness = async (req, res) => {
  try {
    const { scores } = req.body

    if (!scores || !Array.isArray(scores)) {
      return res.status(400).json({ message: 'Scores array is required' })
    }

    const created = []
    for (const item of scores) {
      const assessment = await prisma.readinessAssessment.create({
        data: {
          launchId: req.params.launchId,
          category: item.category,
          score: parseInt(item.score),
          assessedBy: req.userId
        }
      })
      created.push(assessment)
    }

    const parentLaunch = await prisma.launch.findUnique({ where: { id: req.params.launchId }, select: { productName: true } })

    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        entityType: 'ReadinessAssessment',
        entityId: req.params.launchId,
        entityLabel: parentLaunch?.productName || null,
        eventType: 'BULK_UPDATE',
        newValue: { scores: scores.map(s => ({ category: s.category, score: s.score })) }
      }
    })

    res.status(201).json({
      message: `${created.length} readiness scores saved`,
      assessments: created
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

module.exports = { getReadiness, saveReadiness, bulkSaveReadiness }