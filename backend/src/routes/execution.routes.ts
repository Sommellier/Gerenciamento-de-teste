import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { ExecutionController } from '../controllers/execution/execution.controller'
import auth from '../infrastructure/auth'
import { requirePermission, requireAnyPermission } from '../infrastructure/permissions'
import { uploadLimiter } from '../infrastructure/rateLimiter'

const asyncH =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next)

const router = Router()
const executionController = new ExecutionController()

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
      console.error('Erro ao criar diretório de uploads:', error)
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
      console.error('Erro ao criar diretório de uploads de bugs:', error)
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
// Permissões: TESTER, MANAGER, ADMIN, OWNER podem comentar
router.post('/steps/:stepId/comments', auth, asyncH(executionController.addComment.bind(executionController)))
router.get('/steps/:stepId/comments', auth, asyncH(executionController.getComments.bind(executionController)))

// Rotas de anexos/evidências em etapas
// Permissões: TESTER, MANAGER, ADMIN, OWNER podem fazer upload
router.post('/steps/:stepId/attachments', auth, uploadLimiter, upload.single('file'), asyncH(executionController.uploadAttachment.bind(executionController)))
router.get('/steps/:stepId/attachments', auth, asyncH(executionController.getAttachments.bind(executionController)))
router.delete('/steps/:stepId/attachments/:attachmentId', auth, asyncH(executionController.deleteAttachment.bind(executionController)))

// Rota para atualizar status da etapa
router.put('/execution/steps/:stepId/status', auth, asyncH(executionController.updateStepStatusHandler.bind(executionController)))

// Rotas de bugs
// Permissões: TESTER, MANAGER, ADMIN, OWNER podem criar bugs
router.post('/scenarios/:scenarioId/bugs', auth, asyncH(executionController.createBug.bind(executionController)))
router.get('/scenarios/:scenarioId/bugs', auth, asyncH(executionController.getScenarioBugs.bind(executionController)))
router.get('/projects/:projectId/packages/:packageId/bugs', auth, asyncH(executionController.getPackageBugsHandler.bind(executionController)))
router.put('/bugs/:bugId', auth, asyncH(executionController.updateBugHandler.bind(executionController)))
router.delete('/bugs/:bugId', auth, asyncH(executionController.deleteBugHandler.bind(executionController)))
router.post('/bugs/:bugId/attachments', auth, uploadLimiter, bugAttachmentUpload.single('file'), asyncH(executionController.uploadBugAttachment.bind(executionController)))

// Rotas de histórico de execução
// Permissões: Qualquer membro do projeto pode ver o histórico
router.post('/scenarios/:scenarioId/history', auth, asyncH(executionController.registerHistory.bind(executionController)))
router.get('/scenarios/:scenarioId/history', auth, asyncH(executionController.getHistory.bind(executionController)))

export default router

