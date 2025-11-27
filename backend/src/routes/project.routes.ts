// src/routes/project.routes.ts
import { Router } from 'express'
import { createProjectController } from '../controllers/project/createProject.controller'
import { deleteProjectController } from '../controllers/project/deleteProject.controller'
import { updateProjectController } from '../controllers/project/updateProject.controller'
import { getProjectByIdController } from '../controllers/project/getProjectById.controller'
import { getProjectDetailsController } from '../controllers/project/getProjectDetails.controller'
import { listProjects } from '../controllers/project/listProjects.controller'
import { getProjectReleasesController } from '../controllers/scenarios/getProjectReleases.controller'
import auth from '../infrastructure/auth'
import { requireProjectAccess } from '../infrastructure/permissions'

const asyncH =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next)

const router = Router()

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Criar novo projeto
 *     description: Cria um novo projeto no sistema (requer autenticação)
 *     tags: [Projetos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do projeto
 *                 example: "Sistema de Vendas"
 *               description:
 *                 type: string
 *                 description: Descrição do projeto
 *                 example: "Sistema para gerenciamento de vendas online"
 *     responses:
 *       201:
 *         description: Projeto criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: Listar projetos
 *     description: Retorna a lista de projetos do usuário autenticado
 *     tags: [Projetos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de projetos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Obter projeto por ID
 *     description: Retorna os detalhes de um projeto específico
 *     tags: [Projetos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     responses:
 *       200:
 *         description: Detalhes do projeto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Sem permissão para acessar o projeto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Projeto não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Atualizar projeto
 *     description: Atualiza os dados de um projeto
 *     tags: [Projetos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               name:
 *                 type: string
 *                 description: Novo nome do projeto
 *                 example: "Sistema de Vendas v2"
 *               description:
 *                 type: string
 *                 description: Nova descrição do projeto
 *                 example: "Sistema atualizado para gerenciamento de vendas"
 *     responses:
 *       200:
 *         description: Projeto atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Sem permissão para atualizar o projeto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Projeto não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Deletar projeto
 *     description: Remove um projeto do sistema
 *     tags: [Projetos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     responses:
 *       200:
 *         description: Projeto deletado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Projeto deletado com sucesso"
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Sem permissão para deletar o projeto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Projeto não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/projects/{projectId}/details:
 *   get:
 *     summary: Obter detalhes completos do projeto
 *     description: Retorna informações detalhadas do projeto incluindo membros, cenários, etc.
 *     tags: [Projetos]
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
 *         description: Detalhes completos do projeto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 members:
 *                   type: array
 *                   items:
 *                     type: object
 *                 scenarios:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para acessar o projeto
 *       404:
 *         description: Projeto não encontrado
 */

/**
 * @swagger
 * /api/projects/{projectId}/releases:
 *   get:
 *     summary: Obter releases do projeto
 *     description: Retorna a lista de releases/versões do projeto
 *     tags: [Projetos]
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
 *         description: Lista de releases
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   version:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para acessar o projeto
 *       404:
 *         description: Projeto não encontrado
 */

router.post('/projects', auth, asyncH(createProjectController))
router.get('/projects', auth, asyncH(listProjects))
router.get('/projects/:id', auth, requireProjectAccess, asyncH(getProjectByIdController))
router.get('/projects/:projectId/details', auth, requireProjectAccess, asyncH(getProjectDetailsController))
router.get('/projects/:projectId/releases', auth, requireProjectAccess, asyncH(getProjectReleasesController))
router.put('/projects/:id', auth, requireProjectAccess, asyncH(updateProjectController))
router.delete('/projects/:id', auth, requireProjectAccess, asyncH(deleteProjectController))

export default router
