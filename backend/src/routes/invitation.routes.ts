import { Router } from 'express'
import { createInviteController } from '../controllers/invitations/createInvite.controller'
import { listInvitesController } from '../controllers/invitations/listInvites.controller'
import { listUserInvitesController } from '../controllers/invitations/listUserInvites.controller'
import { acceptInviteController } from '../controllers/invitations/acceptInvite.controller'
import { declineInviteController } from '../controllers/invitations/declineInvite.controller'
import auth from '../infrastructure/auth'
import { inviteLimiter } from '../infrastructure/rateLimiter'
import { requireProjectAccess } from '../infrastructure/permissions'


const asyncH =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next)

const router = Router()

/**
 * @swagger
 * /api/projects/{projectId}/invites:
 *   post:
 *     summary: Criar convite
 *     description: Cria um novo convite para adicionar um usuário ao projeto
 *     tags: [Convites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do usuário a ser convidado
 *                 example: "usuario.convidado@exemplo.com"
 *               role:
 *                 type: string
 *                 enum: [OWNER, MANAGER, TESTER]
 *                 description: Papel que o usuário terá no projeto
 *                 example: "TESTER"
 *     responses:
 *       201:
 *         description: Convite criado e enviado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para criar convites
 *   get:
 *     summary: Listar convites do projeto
 *     description: Retorna todos os convites pendentes de um projeto
 *     tags: [Convites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     responses:
 *       200:
 *         description: Lista de convites
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para acessar

/**
 * @swagger
 * /api/invites:
 *   get:
 *     summary: Listar convites do usuário
 *     description: Retorna todos os convites pendentes do usuário autenticado
 *     tags: [Convites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de convites do usuário
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   projectId:
 *                     type: string
 *                   projectName:
 *                     type: string
 *                   role:
 *                     type: string
 *                   status:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Não autenticado

/**
 * @swagger
 * /api/invites/{token}/accept:
 *   post:
 *     summary: Aceitar convite
 *     description: Aceita um convite para participar de um projeto usando o token na URL
 *     tags: [Convites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token do convite
 *     responses:
 *       200:
 *         description: Convite aceito com sucesso
 *       400:
 *         description: Convite inválido ou expirado
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Convite não encontrado

/**
 * @swagger
 * /api/invites/accept:
 *   post:
 *     summary: Aceitar convite (com token no body)
 *     description: Aceita um convite usando o token enviado no corpo da requisição
 *     tags: [Convites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token do convite
 *                 example: "token_do_convite_aqui"
 *     responses:
 *       200:
 *         description: Convite aceito com sucesso
 *       400:
 *         description: Convite inválido ou expirado
 *       401:
 *         description: Não autenticado

/**
 * @swagger
 * /api/invites/{token}/decline:
 *   post:
 *     summary: Recusar convite
 *     description: Recusa um convite para participar de um projeto usando o token na URL
 *     tags: [Convites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token do convite
 *     responses:
 *       200:
 *         description: Convite recusado com sucesso
 *       400:
 *         description: Convite inválido ou expirado
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Convite não encontrado

/**
 * @swagger
 * /api/invites/decline:
 *   post:
 *     summary: Recusar convite (com token no body)
 *     description: Recusa um convite usando o token enviado no corpo da requisição
 *     tags: [Convites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token do convite
 *                 example: "token_do_convite_aqui"
 *     responses:
 *       200:
 *         description: Convite recusado com sucesso
 *       400:
 *         description: Convite inválido ou expirado
 *       401:
 *         description: Não autenticado
 */

router.post('/projects/:projectId/invites', auth, requireProjectAccess, inviteLimiter, asyncH(createInviteController))
router.get('/projects/:projectId/invites', auth, requireProjectAccess, asyncH(listInvitesController))
router.get('/invites', auth, asyncH(listUserInvitesController))
router.post('/invites/:token/accept', auth, asyncH(acceptInviteController))
router.post('/invites/accept', auth, asyncH(acceptInviteController))
router.post('/invites/:token/decline', auth, asyncH(declineInviteController))
router.post('/invites/decline', auth, asyncH(declineInviteController))

export default router
