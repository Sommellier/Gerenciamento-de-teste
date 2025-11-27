import { Router } from 'express'
import { auth } from '../infrastructure/auth'
import { requireProjectAccess } from '../infrastructure/permissions'
import { createPackageController } from '../controllers/packages/createPackage.controller'
import { getProjectPackagesController } from '../controllers/packages/getProjectPackages.controller'
import { getPackageDetailsController } from '../controllers/packages/getPackageDetails.controller'
import { updatePackageController } from '../controllers/packages/updatePackage.controller'
import { deletePackageController } from '../controllers/packages/deletePackage.controller'
import { createScenarioInPackageController } from '../controllers/scenarios/createScenarioInPackage.controller'
import { approvePackageController } from '../controllers/packages/approvePackage.controller'
import { rejectPackageController } from '../controllers/packages/rejectPackage.controller'
import { sendPackageToTestController } from '../controllers/packages/sendToTest.controller'

const router = Router()

/**
 * @swagger
 * /api/projects/{projectId}/packages:
 *   post:
 *     summary: Criar novo pacote de teste
 *     description: Cria um novo pacote de teste em um projeto
 *     tags: [Pacotes]
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do pacote
 *                 example: "Sprint 1 - Funcionalidades de Login"
 *               description:
 *                 type: string
 *                 description: Descrição do pacote
 *                 example: "Pacote de testes para validação das funcionalidades de autenticação"
 *               release:
 *                 type: string
 *                 description: Versão/release do pacote
 *                 example: "v1.0.0"
 *     responses:
 *       201:
 *         description: Pacote criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para criar pacote
 *   get:
 *     summary: Listar pacotes do projeto
 *     description: Retorna todos os pacotes de teste de um projeto
 *     tags: [Pacotes]
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
 *         description: Lista de pacotes
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
 *                   status:
 *                     type: string
 *                   release:
 *                     type: string
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para acessar o projeto

/**
 * @swagger
 * /api/projects/{projectId}/packages/{packageId}:
 *   get:
 *     summary: Obter detalhes do pacote
 *     description: Retorna os detalhes completos de um pacote de teste
 *     tags: [Pacotes]
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
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pacote
 *     responses:
 *       200:
 *         description: Detalhes do pacote
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para acessar
 *       404:
 *         description: Pacote não encontrado
 *   put:
 *     summary: Atualizar pacote
 *     description: Atualiza os dados de um pacote de teste
 *     tags: [Pacotes]
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
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pacote
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Sprint 1 - Atualizado"
 *               description:
 *                 type: string
 *               release:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pacote atualizado com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para atualizar
 *       404:
 *         description: Pacote não encontrado
 *   delete:
 *     summary: Deletar pacote
 *     description: Remove um pacote de teste do sistema
 *     tags: [Pacotes]
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
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pacote
 *     responses:
 *       200:
 *         description: Pacote deletado com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para deletar
 *       404:
 *         description: Pacote não encontrado

/**
 * @swagger
 * /api/projects/{projectId}/packages/{packageId}/approve:
 *   post:
 *     summary: Aprovar pacote
 *     description: Aprova um pacote de teste para execução
 *     tags: [Pacotes]
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
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pacote
 *     responses:
 *       200:
 *         description: Pacote aprovado com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para aprovar
 *       404:
 *         description: Pacote não encontrado

/**
 * @swagger
 * /api/projects/{projectId}/packages/{packageId}/reject:
 *   post:
 *     summary: Reprovar pacote
 *     description: Reprova um pacote de teste
 *     tags: [Pacotes]
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
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pacote
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Motivo da reprovação
 *                 example: "Cenários incompletos"
 *     responses:
 *       200:
 *         description: Pacote reprovado com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para reprovar
 *       404:
 *         description: Pacote não encontrado

/**
 * @swagger
 * /api/projects/{projectId}/packages/{packageId}/send-to-test:
 *   post:
 *     summary: Enviar pacote para teste
 *     description: Envia um pacote aprovado para execução de testes
 *     tags: [Pacotes]
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
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pacote
 *     responses:
 *       200:
 *         description: Pacote enviado para teste com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para enviar
 *       404:
 *         description: Pacote não encontrado

/**
 * @swagger
 * /api/projects/{projectId}/packages/{packageId}/scenarios:
 *   post:
 *     summary: Criar cenário no pacote
 *     description: Cria um novo cenário de teste diretamente em um pacote
 *     tags: [Pacotes]
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
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pacote
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Cenário de teste de login"
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cenário criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para criar cenário
 */

// Rotas para pacotes de teste
router.post('/projects/:projectId/packages', auth, requireProjectAccess, createPackageController)
router.get('/projects/:projectId/packages', auth, requireProjectAccess, getProjectPackagesController)
router.get('/projects/:projectId/packages/:packageId', auth, requireProjectAccess, getPackageDetailsController)
router.put('/projects/:projectId/packages/:packageId', auth, requireProjectAccess, updatePackageController)
router.delete('/projects/:projectId/packages/:packageId', auth, requireProjectAccess, deletePackageController)

// Rotas de aprovação/reprovação
router.post('/projects/:projectId/packages/:packageId/approve', auth, requireProjectAccess, approvePackageController)
router.post('/projects/:projectId/packages/:packageId/reject', auth, requireProjectAccess, rejectPackageController)
router.post('/projects/:projectId/packages/:packageId/send-to-test', auth, requireProjectAccess, sendPackageToTestController)

// Rota para criar cenário dentro de um pacote
router.post('/projects/:projectId/packages/:packageId/scenarios', auth, requireProjectAccess, createScenarioInPackageController)

export default router
