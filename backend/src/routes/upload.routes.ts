import { Router } from 'express'
import { uploadAvatarController, uploadMiddleware } from '../controllers/upload/uploadAvatar.controller'
import { auth } from '../infrastructure/auth'
import { uploadLimiter } from '../infrastructure/rateLimiter'

const router = Router()

// Upload de avatar
router.post('/upload/avatar', auth, uploadLimiter, uploadMiddleware, uploadAvatarController)

export default router
