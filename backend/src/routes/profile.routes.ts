import { Router } from 'express'
import { getProfileController } from '../controllers/profile/getProfile.controller'
import { auth } from '../infrastructure/auth'

const router = Router()

// Buscar perfil do usuário logado
router.get('/profile', auth, getProfileController)

export default router
