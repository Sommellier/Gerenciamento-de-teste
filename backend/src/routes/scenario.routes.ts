import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { ScenarioController } from '../controllers/scenarios/scenario.controller'
import auth from '../infrastructure/auth'
import { uploadLimiter } from '../infrastructure/rateLimiter'
import { logger } from '../utils/logger'
import { requireProjectAccessFromPackage, requireProjectAccessFromScenario } from '../infrastructure/permissions'

const asyncH =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next)

const router = Router()
const scenarioController = new ScenarioController()

/**
 * @swagger
 * /api/packages/{packageId}/scenarios:
 *   get:
 *     summary: Listar cenários de um pacote
 *     description: Retorna todos os cenários de teste de um pacote específico
 *     tags: [Cenários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pacote
 *     responses:
 *       200:
 *         description: Lista de cenários do pacote
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   status:
 *                     type: string
 *                   packageId:
 *                     type: string
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para acessar o projeto
 *   post:
 *     summary: Criar novo cenário em um pacote
 *     description: Cria um novo cenário de teste dentro de um pacote
 *     tags: [Cenários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *                 description: Título do cenário
 *                 example: "Login com credenciais válidas"
 *               description:
 *                 type: string
 *                 description: Descrição detalhada do cenário
 *                 example: "Verificar se o login funciona com email e senha corretos"
 *               preConditions:
 *                 type: string
 *                 description: Pré-condições para execução
 *                 example: "Usuário deve estar cadastrado no sistema"
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

/**
 * @swagger
 * /api/scenarios/{id}:
 *   get:
 *     summary: Obter cenário por ID
 *     description: Retorna os detalhes completos de um cenário de teste
 *     tags: [Cenários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do cenário
 *     responses:
 *       200:
 *         description: Detalhes do cenário
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para acessar o cenário
 *       404:
 *         description: Cenário não encontrado
 *   put:
 *     summary: Atualizar cenário
 *     description: Atualiza os dados de um cenário de teste
 *     tags: [Cenários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do cenário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Login com credenciais válidas - Atualizado"
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [PENDENTE, APROVADO, REPROVADO, BLOQUEADO]
 *     responses:
 *       200:
 *         description: Cenário atualizado com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para atualizar
 *       404:
 *         description: Cenário não encontrado
 *   delete:
 *     summary: Deletar cenário
 *     description: Remove um cenário de teste do sistema
 *     tags: [Cenários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do cenário
 *     responses:
 *       200:
 *         description: Cenário deletado com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para deletar
 *       404:
 *         description: Cenário não encontrado
 */

/**
 * @swagger
 * /api/scenarios/{id}/executions:
 *   post:
 *     summary: Executar cenário
 *     description: Inicia uma nova execução de um cenário de teste
 *     tags: [Cenários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do cenário
 *     responses:
 *       201:
 *         description: Execução iniciada com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para executar
 *       404:
 *         description: Cenário não encontrado
 */

/**
 * @swagger
 * /api/scenarios/{id}/duplicate:
 *   post:
 *     summary: Duplicar cenário
 *     description: Cria uma cópia de um cenário de teste existente
 *     tags: [Cenários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do cenário a ser duplicado
 *     responses:
 *       201:
 *         description: Cenário duplicado com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para duplicar
 *       404:
 *         description: Cenário não encontrado

/**
 * @swagger
 * /api/scenarios/{id}/evidences:
 *   post:
 *     summary: Upload de evidência
 *     description: Faz upload de uma evidência (imagem/PDF) para um cenário
 *     tags: [Cenários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do cenário
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
 *                 description: Arquivo de evidência (imagem JPG/PNG ou PDF, máximo 5MB)
 *     responses:
 *       201:
 *         description: Evidência enviada com sucesso
 *       400:
 *         description: Arquivo inválido ou muito grande
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para fazer upload
 */

/**
 * @swagger
 * /api/packages/{packageId}/scenarios/export.csv:
 *   get:
 *     summary: Exportar cenários para CSV
 *     description: Exporta todos os cenários de um pacote em formato CSV
 *     tags: [Cenários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pacote
 *     responses:
 *       200:
 *         description: Arquivo CSV gerado
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para exportar
 */

/**
 * @swagger
 * /api/packages/{packageId}/scenarios/report.pdf:
 *   get:
 *     summary: Gerar relatório PDF de cenários
 *     description: Gera um relatório em PDF com todos os cenários de um pacote
 *     tags: [Cenários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pacote
 *     responses:
 *       200:
 *         description: Relatório PDF gerado
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para gerar relatório
 */

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Usar caminho absoluto para garantir que funcione em produção
      const uploadPath = path.join(process.cwd(), 'uploads', 'evidences')
      // Criar diretório se não existir
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true })
      }
      cb(null, uploadPath)
    } catch (error) {
      // Se houver erro ao criar diretório, passar para o callback
      logger.error('Erro ao criar diretório de uploads:', error)
      cb(error as Error, '')
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
})

// Rotas para cenários de pacotes
router.get('/packages/:packageId/scenarios', auth, asyncH(requireProjectAccessFromPackage), asyncH(scenarioController.getPackageScenarios.bind(scenarioController)))
router.post('/packages/:packageId/scenarios', auth, asyncH(requireProjectAccessFromPackage), asyncH(scenarioController.createScenario.bind(scenarioController)))

// Rotas para cenários individuais
router.get('/scenarios/:id', auth, asyncH(requireProjectAccessFromScenario), asyncH(scenarioController.getScenarioById.bind(scenarioController)))
router.put('/scenarios/:id', auth, asyncH(requireProjectAccessFromScenario), asyncH(scenarioController.updateScenario.bind(scenarioController)))
router.delete('/scenarios/:id', auth, asyncH(requireProjectAccessFromScenario), asyncH(scenarioController.deleteScenario.bind(scenarioController)))

// Rotas para execução de cenários
router.post('/scenarios/:id/executions', auth, asyncH(requireProjectAccessFromScenario), asyncH(scenarioController.executeScenario.bind(scenarioController)))
router.post('/scenarios/:id/duplicate', auth, asyncH(requireProjectAccessFromScenario), asyncH(scenarioController.duplicateScenario.bind(scenarioController)))

// Rotas para evidências
router.post('/scenarios/:id/evidences', auth, asyncH(requireProjectAccessFromScenario), uploadLimiter, upload.single('file'), asyncH(scenarioController.uploadEvidence.bind(scenarioController)))

// Rotas para exportação
router.get('/packages/:packageId/scenarios/export.csv', auth, asyncH(requireProjectAccessFromPackage), asyncH(scenarioController.exportScenariosToCSV.bind(scenarioController)))
router.get('/packages/:packageId/scenarios/report.pdf', auth, asyncH(requireProjectAccessFromPackage), asyncH(scenarioController.generateScenarioReport.bind(scenarioController)))

export default router