const express = require('express')
const router = express.Router({ mergeParams: true })
const protect = require('../middleware/auth.middleware')
const { getComments, addComment } = require('../controllers/comment.controller')

router.use(protect)

router.get('/', getComments)
router.post('/', addComment)

module.exports = router