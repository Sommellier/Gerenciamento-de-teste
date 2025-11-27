import { Router } from 'express'
import { uploadAvatarController, uploadMiddleware } from '../controllers/upload/uploadAvatar.controller'
import { auth } from '../infrastructure/auth'
import { uploadLimiter } from '../infrastructure/rateLimiter'

const router = Router()

/**
 * @swagger
 * /api/upload/avatar:
 *   post:
 *     summary: Upload de avatar
 *     description: Faz upload de uma imagem de avatar para o usuário autenticado
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Imagem de avatar (JPG, PNG, máximo 2MB)
 *     responses:
 *       200:
 *         description: Avatar enviado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Avatar atualizado com sucesso"
 *                 avatarUrl:
 *                   type: string
 *                   example: "/uploads/avatars/avatar-1234567890.jpg"
 *       400:
 *         description: Arquivo inválido ou muito grande
 *       401:
 *         description: Não autenticado
 */

// Upload de avatar
router.post('/upload/avatar', auth, uploadLimiter, uploadMiddleware, uploadAvatarController)

export default router
