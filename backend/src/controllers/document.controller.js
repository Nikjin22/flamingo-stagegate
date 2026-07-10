const prisma = require('../config/db')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')

// Create uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname)
    cb(null, uniqueName)
  }
})

// File filter — allow only safe file types
const fileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'image/gif',
    'text/plain', 'text/csv'
  ]
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('File type not allowed'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
})

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const { stageId, category } = req.body

    // Check if a previous version exists
    const existing = await prisma.document.findFirst({
      where: {
        launchId: req.params.launchId,
        fileName: req.file.originalname
      },
      orderBy: { version: 'desc' }
    })

    const version = existing ? existing.version + 1 : 1

    const document = await prisma.document.create({
      data: {
        launchId: req.params.launchId,
        stageId: stageId || null,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        storagePath: req.file.filename,
        version,
        uploadedBy: req.userId
      },
      include: {
        uploader: { select: { id: true, fullName: true } }
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        entityType: 'Document',
        entityId: document.id,
        entityLabel: document.fileName,
        eventType: 'CREATE',
        newValue: { fileName: document.fileName, category: category || null, version: document.version }
      }
    })

    res.status(201).json({ message: 'Document uploaded successfully', document })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

const getDocuments = async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      where: { launchId: req.params.launchId },
      include: {
        uploader: { select: { id: true, fullName: true } }
      },
      orderBy: { uploadedAt: 'desc' }
    })
    res.json(documents)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const downloadDocument = async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.docId }
    })

    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }

    const filePath = path.join(uploadDir, document.storagePath)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' })
    }

    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`)
    res.setHeader('Content-Type', document.fileType)
    res.sendFile(filePath)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

const deleteDocument = async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.docId }
    })

    if (!document) {
      return res.status(404).json({ message: 'Document not found' })
    }

    // Delete file from disk
    const filePath = path.join(uploadDir, document.storagePath)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    await prisma.document.delete({ where: { id: req.params.docId } })

    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        entityType: 'Document',
        entityId: req.params.docId,
        entityLabel: document.fileName,
        eventType: 'DELETE',
        newValue: { fileName: document.fileName }
      }
    })

    res.json({ message: 'Document deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

module.exports = { upload, uploadDocument, getDocuments, downloadDocument, deleteDocument }