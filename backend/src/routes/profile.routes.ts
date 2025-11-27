import { Router } from 'express'
import { getProfileController } from '../controllers/profile/getProfile.controller'
import { auth } from '../infrastructure/auth'

const router = Router()

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Obter perfil do usuário
 *     description: Retorna os dados do perfil do usuário autenticado
 *     tags: [Perfil]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do perfil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                 avatarUrl:
 *                   type: string
 *                   nullable: true
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Não autenticado
 */

// Buscar perfil do usuário logado
router.get('/profile', auth, getProfileController)

export default router
