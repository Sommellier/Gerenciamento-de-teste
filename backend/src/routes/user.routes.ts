import { Router } from 'express'
import { registerUserController } from '../controllers/user/createUser.controller'
import { loginUserController } from  '../controllers/user/loginUser.controller'
import { deleteUserController } from '../controllers/user/deleteUser.controller'
import { updateUserController } from '../controllers/user/updateUser.controller'
import { forgotPasswordController } from '../controllers/user/requestPasswordReset.controller'
import { resetPasswordController } from '../controllers/user/resetPassword.controller'
import { loginLimiter, registerLimiter, passwordResetLimiter, userLimiter } from '../infrastructure/rateLimiter'
import auth from '../infrastructure/auth'
import { csrfProtection } from '../infrastructure/csrf'

const router = Router()

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Registrar novo usuário
 *     description: Cria uma nova conta de usuário no sistema
 *     tags: [Usuários]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome completo do usuário
 *                 example: "João Silva"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do usuário (use qa.teste@exemplo.com para demonstração)
 *                 example: "qa.teste@exemplo.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Senha do usuário (mínimo 6 caracteres). Para demo: Senha123!
 *                 example: "Senha123!"
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Dados inválidos ou email já cadastrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Autenticar usuário
 *     description: Realiza login e retorna tokens de acesso e refresh
 *     tags: [Usuários]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do usuário (use qa.teste@exemplo.com para demonstração)
 *                 example: "qa.teste@exemplo.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Senha do usuário (para demo: Senha123!)
 *                 example: "Senha123!"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                   description: Token JWT para autenticação (exemplo genérico)
 *                   example: "seu_access_token_aqui"
 *                 refreshToken:
 *                   type: string
 *                   description: Token para renovar o access token (exemplo genérico)
 *                   example: "seu_refresh_token_aqui"
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Atualizar usuário
 *     description: Atualiza os dados de um usuário (requer autenticação)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Novo nome do usuário
 *                 example: "João Silva Santos"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Novo email do usuário
 *                 example: "qa.teste@exemplo.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Nova senha (opcional)
 *                 example: "novaSenha123"
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Usuário não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Deletar usuário
 *     description: Remove um usuário do sistema (requer autenticação)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Usuário deletado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuário deletado com sucesso"
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Usuário não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/request-password-reset:
 *   post:
 *     summary: Solicitar recuperação de senha
 *     description: Envia um email com link para redefinição de senha
 *     tags: [Usuários]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do usuário (use qa.teste@exemplo.com para demonstração)
 *                 example: "qa.teste@exemplo.com"
 *     responses:
 *       200:
 *         description: Email de recuperação enviado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email de recuperação enviado"
 *       400:
 *         description: Email não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/reset-password:
 *   post:
 *     summary: Redefinir senha
 *     description: Redefine a senha usando o token recebido por email
 *     tags: [Usuários]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de recuperação recebido por email
 *                 example: "token_de_recuperacao_aqui"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Nova senha
 *                 example: "novaSenha123"
 *     responses:
 *       200:
 *         description: Senha redefinida com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Senha redefinida com sucesso"
 *       400:
 *         description: Token inválido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.post('/register', csrfProtection, registerLimiter, (req, res, next) => {
  Promise.resolve(registerUserController(req, res)).catch(next)
})

router.post('/login', csrfProtection, loginLimiter, (req, res, next) => {
  Promise.resolve(loginUserController(req, res)).catch(next)
})

// Rotas que requerem autenticação e têm limite por usuário
router.delete('/users/:id', auth, userLimiter, (req, res, next) => {
  Promise.resolve(deleteUserController(req, res)).catch(next)
})

router.put('/users/:id', auth, userLimiter, (req, res, next) => {
  Promise.resolve(updateUserController(req, res)).catch(next)
})

// Recuperação de senha com limite específico por email
router.post('/request-password-reset', csrfProtection, passwordResetLimiter, (req, res, next) => {
  Promise.resolve(forgotPasswordController(req, res)).catch(next)
})

router.post('/reset-password', csrfProtection, (req, res, next) => {
  Promise.resolve(resetPasswordController(req, res)).catch(next)
})

export default router
