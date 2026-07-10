const express = require('express')
const router = express.Router({ mergeParams: true })
const protect = require('../middleware/auth.middleware')
const {
  upload,
  uploadDocument,
  getDocuments,
  downloadDocument,
  deleteDocument
} = require('../controllers/document.controller')

router.use(protect)

router.get('/', getDocuments)
router.post('/', upload.single('file'), uploadDocument)
router.get('/:docId/download', downloadDocument)
router.delete('/:docId', deleteDocument)

module.exports = router