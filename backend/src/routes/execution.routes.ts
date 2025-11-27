import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { ExecutionController } from '../controllers/execution/execution.controller'
import auth from '../infrastructure/auth'
import { requirePermission, requireAnyPermission, requireProjectAccess, requireProjectAccessFromStep, requireProjectAccessFromScenario, requireProjectAccessFromBug } from '../infrastructure/permissions'
import { uploadLimiter } from '../infrastructure/rateLimiter'
import { logger } from '../utils/logger'

const asyncH =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next)

const router = Router()
const executionController = new ExecutionController()

/**
 * @swagger
 * /api/steps/{stepId}/comments:
 *   post:
 *     summary: Adicionar comentário em etapa
 *     description: Adiciona um comentário em uma etapa de execução
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da etapa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comment
 *             properties:
 *               comment:
 *                 type: string
 *                 description: Texto do comentário
 *                 example: "Etapa executada com sucesso"
 *     responses:
 *       201:
 *         description: Comentário adicionado com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para comentar
 *   get:
 *     summary: Listar comentários da etapa
 *     description: Retorna todos os comentários de uma etapa de execução
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da etapa
 *     responses:
 *       200:
 *         description: Lista de comentários
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para acessar

/**
 * @swagger
 * /api/steps/{stepId}/attachments:
 *   post:
 *     summary: Upload de anexo em etapa
 *     description: Faz upload de um anexo/evidência para uma etapa de execução
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da etapa
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
 *                 description: Arquivo de evidência (JPG, PNG ou PDF, máximo 5MB)
 *     responses:
 *       201:
 *         description: Anexo enviado com sucesso
 *       400:
 *         description: Arquivo inválido
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para fazer upload
 *   get:
 *     summary: Listar anexos da etapa
 *     description: Retorna todos os anexos de uma etapa de execução
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da etapa
 *     responses:
 *       200:
 *         description: Lista de anexos
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para acessar

/**
 * @swagger
 * /api/steps/{stepId}/attachments/{attachmentId}:
 *   delete:
 *     summary: Deletar anexo
 *     description: Remove um anexo de uma etapa de execução
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da etapa
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do anexo
 *     responses:
 *       200:
 *         description: Anexo deletado com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para deletar
 *       404:
 *         description: Anexo não encontrado

/**
 * @swagger
 * /api/execution/steps/{stepId}/status:
 *   put:
 *     summary: Atualizar status da etapa
 *     description: Atualiza o status de execução de uma etapa
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da etapa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PASSED, FAILED, BLOCKED, SKIPPED]
 *                 description: Novo status da etapa
 *                 example: "PASSED"
 *     responses:
 *       200:
 *         description: Status atualizado com sucesso
 *       400:
 *         description: Status inválido
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para atualizar

/**
 * @swagger
 * /api/scenarios/{scenarioId}/bugs:
 *   post:
 *     summary: Criar bug
 *     description: Cria um novo bug relacionado a um cenário de teste
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scenarioId
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
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 description: Título do bug
 *                 example: "Erro ao fazer login"
 *               description:
 *                 type: string
 *                 description: Descrição detalhada do bug
 *                 example: "Ao tentar fazer login, o sistema retorna erro 500"
 *               severity:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *                 description: Severidade do bug
 *                 example: "HIGH"
 *     responses:
 *       201:
 *         description: Bug criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para criar bug
 *   get:
 *     summary: Listar bugs do cenário
 *     description: Retorna todos os bugs relacionados a um cenário
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do cenário
 *     responses:
 *       200:
 *         description: Lista de bugs
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para acessar

/**
 * @swagger
 * /api/projects/{projectId}/packages/{packageId}/bugs:
 *   get:
 *     summary: Listar bugs do pacote
 *     description: Retorna todos os bugs de um pacote de teste
 *     tags: [Execuções]
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
 *         description: Lista de bugs do pacote
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para acessar

/**
 * @swagger
 * /api/bugs/{bugId}:
 *   put:
 *     summary: Atualizar bug
 *     description: Atualiza os dados de um bug
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bugId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do bug
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *               status:
 *                 type: string
 *                 enum: [OPEN, IN_PROGRESS, RESOLVED, CLOSED]
 *     responses:
 *       200:
 *         description: Bug atualizado com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para atualizar
 *       404:
 *         description: Bug não encontrado
 *   delete:
 *     summary: Deletar bug
 *     description: Remove um bug do sistema
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bugId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do bug
 *     responses:
 *       200:
 *         description: Bug deletado com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para deletar
 *       404:
 *         description: Bug não encontrado

/**
 * @swagger
 * /api/bugs/{bugId}/attachments:
 *   post:
 *     summary: Upload de anexo em bug
 *     description: Faz upload de um anexo (PDF, Word, Excel, PowerPoint) para um bug
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bugId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do bug
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
 *                 description: Arquivo anexo (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, máximo 10MB)
 *     responses:
 *       201:
 *         description: Anexo enviado com sucesso
 *       400:
 *         description: Arquivo inválido
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para fazer upload

/**
 * @swagger
 * /api/scenarios/{scenarioId}/history:
 *   post:
 *     summary: Registrar histórico de execução
 *     description: Registra um novo evento no histórico de execução de um cenário
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scenarioId
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
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 description: Ação realizada
 *                 example: "Execução iniciada"
 *               details:
 *                 type: string
 *                 description: Detalhes adicionais
 *     responses:
 *       201:
 *         description: Histórico registrado com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para registrar
 *   get:
 *     summary: Obter histórico de execução
 *     description: Retorna o histórico completo de execuções de um cenário
 *     tags: [Execuções]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do cenário
 *     responses:
 *       200:
 *         description: Histórico de execuções
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão para acessar
 */

// Configuração do multer para upload de evidências
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
    cb(null, 'evidence-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de arquivo não permitido'))
    }
  }
})

// Configuração do multer para upload de anexos de bugs
const bugAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Usar caminho absoluto para garantir que funcione em produção
      const uploadPath = path.join(process.cwd(), 'uploads', 'bug-attachments')
      // Criar diretório se não existir
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true })
      }
      cb(null, uploadPath)
    } catch (error) {
      // Se houver erro ao criar diretório, passar para o callback
      logger.error('Erro ao criar diretório de uploads de bugs:', error)
      cb(error as Error, '')
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'bug-attachment-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const bugAttachmentUpload = multer({
  storage: bugAttachmentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
    ]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use PDF, Word, PowerPoint ou Excel'))
    }
  }
})

// Rotas de comentários em etapas
// Permissões: TESTER, MANAGER, OWNER podem comentar
router.post('/steps/:stepId/comments', auth, asyncH(requireProjectAccessFromStep), asyncH(executionController.addComment.bind(executionController)))
router.get('/steps/:stepId/comments', auth, asyncH(requireProjectAccessFromStep), asyncH(executionController.getComments.bind(executionController)))

// Rotas de anexos/evidências em etapas
// Permissões: TESTER, MANAGER, OWNER podem fazer upload
router.post('/steps/:stepId/attachments', auth, asyncH(requireProjectAccessFromStep), uploadLimiter, upload.single('file'), asyncH(executionController.uploadAttachment.bind(executionController)))
router.get('/steps/:stepId/attachments', auth, asyncH(requireProjectAccessFromStep), asyncH(executionController.getAttachments.bind(executionController)))
router.delete('/steps/:stepId/attachments/:attachmentId', auth, asyncH(requireProjectAccessFromStep), asyncH(executionController.deleteAttachment.bind(executionController)))

// Rota para atualizar status da etapa
router.put('/execution/steps/:stepId/status', auth, asyncH(requireProjectAccessFromStep), asyncH(executionController.updateStepStatusHandler.bind(executionController)))

// Rotas de bugs
// Permissões: TESTER, MANAGER, OWNER podem criar bugs
router.post('/scenarios/:scenarioId/bugs', auth, asyncH(requireProjectAccessFromScenario), asyncH(executionController.createBug.bind(executionController)))
router.get('/scenarios/:scenarioId/bugs', auth, asyncH(requireProjectAccessFromScenario), asyncH(executionController.getScenarioBugs.bind(executionController)))
router.get('/projects/:projectId/packages/:packageId/bugs', auth, asyncH(requireProjectAccess), asyncH(executionController.getPackageBugsHandler.bind(executionController)))
router.put('/bugs/:bugId', auth, asyncH(requireProjectAccessFromBug), asyncH(executionController.updateBugHandler.bind(executionController)))
router.delete('/bugs/:bugId', auth, asyncH(requireProjectAccessFromBug), asyncH(executionController.deleteBugHandler.bind(executionController)))
router.post('/bugs/:bugId/attachments', auth, asyncH(requireProjectAccessFromBug), uploadLimiter, bugAttachmentUpload.single('file'), asyncH(executionController.uploadBugAttachment.bind(executionController)))

// Rotas de histórico de execução
// Permissões: Qualquer membro do projeto pode ver o histórico
router.post('/scenarios/:scenarioId/history', auth, asyncH(requireProjectAccessFromScenario), asyncH(executionController.registerHistory.bind(executionController)))
router.get('/scenarios/:scenarioId/history', auth, asyncH(requireProjectAccessFromScenario), asyncH(executionController.getHistory.bind(executionController)))

export default router

