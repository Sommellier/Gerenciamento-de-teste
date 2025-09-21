import { Router } from 'express'
import { uploadAvatarController, uploadMiddleware } from '../controllers/upload/uploadAvatar.controller'
import { auth } from '../infrastructure/auth'

const router = Router()

// Upload de avatar
router.post('/upload/avatar', auth, uploadMiddleware, uploadAvatarController)

export default router
