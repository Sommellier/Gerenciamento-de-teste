import { Router } from 'express'
import { addMemberByEmailController } from '../controllers/members/addMemberByEmail.controller'
import { listMembersController } from '../controllers/members/listMembers.controller'
import { updateMemberRoleController } from '../controllers/members/updateMemberRole.controller'
import { removeMemberController } from '../controllers/members/removeMember.controller'
import { leaveProjectController } from '../controllers/members/leaveProject.controller'
import { auth } from '../infrastructure/auth'
import { requireProjectAccess } from '../infrastructure/permissions'


const asyncH =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next)

const router = Router()

/**
 * @swagger
 * /api/projects/{projectId}/members:
 *   get:
 *     summary: Listar membros do projeto
 *     description: Retorna todos os membros de um projeto com suas permissões
 *     tags: [Membros]
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
 *         description: Lista de membros do projeto
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   role:
 *                     type: string
 *                     enum: [OWNER, MANAGER, TESTER]
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para acessar o projeto
 *   post:
 *     summary: Adicionar membro por email
 *     description: Adiciona um novo membro ao projeto através do email
 *     tags: [Membros]
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
 *                 description: Email do usuário a ser adicionado
 *                 example: "novo.membro@exemplo.com"
 *               role:
 *                 type: string
 *                 enum: [OWNER, MANAGER, TESTER]
 *                 description: Papel do membro no projeto
 *                 example: "TESTER"
 *     responses:
 *       201:
 *         description: Membro adicionado com sucesso
 *       400:
 *         description: Dados inválidos ou usuário não encontrado
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para adicionar membros

/**
 * @swagger
 * /api/projects/{projectId}/members/{userId}/role:
 *   put:
 *     summary: Atualizar papel do membro
 *     description: Atualiza o papel/permissão de um membro no projeto
 *     tags: [Membros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *       - in: path
 *         name: userId
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
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [OWNER, MANAGER, TESTER]
 *                 description: Novo papel do membro
 *                 example: "MANAGER"
 *     responses:
 *       200:
 *         description: Papel atualizado com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para atualizar
 *       404:
 *         description: Membro não encontrado

/**
 * @swagger
 * /api/projects/{projectId}/members/{userId}:
 *   delete:
 *     summary: Remover membro do projeto
 *     description: Remove um membro de um projeto
 *     tags: [Membros]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *     responses:
 *       200:
 *         description: Membro removido com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para remover
 *       404:
 *         description: Membro não encontrado

/**
 * @swagger
 * /api/projects/{projectId}/members/leave:
 *   post:
 *     summary: Sair do projeto
 *     description: Permite que um membro saia voluntariamente de um projeto
 *     tags: [Membros]
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
 *         description: Saída do projeto realizada com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Não é membro do projeto
 *       400:
 *         description: Owner não pode sair do projeto
 */

// Rotas com auth e verificação de acesso ao projeto
router.post('/projects/:projectId/members/by-email', auth, requireProjectAccess, asyncH(addMemberByEmailController))
router.put('/projects/:projectId/members/:userId/role', auth, requireProjectAccess, asyncH(updateMemberRoleController))
router.delete('/projects/:projectId/members/:userId', auth, requireProjectAccess, asyncH(removeMemberController))
router.post('/projects/:projectId/members/leave', auth, requireProjectAccess, asyncH(leaveProjectController))

// Rota para listar membros do projeto
router.get('/projects/:projectId/members', auth, requireProjectAccess, asyncH(listMembersController))

export default router
