import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { ExecutionController } from '../controllers/execution/execution.controller'
import auth from '../infrastructure/auth'
import { requirePermission, requireAnyPermission } from '../infrastructure/permissions'

const asyncH =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next)

const router = Router()
const executionController = new ExecutionController()

// Configuração do multer para upload de evidências
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/evidences/')
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

// Rotas de comentários em etapas
// Permissões: TESTER, MANAGER, ADMIN, OWNER podem comentar
router.post('/steps/:stepId/comments', asyncH(executionController.addComment.bind(executionController)))
router.get('/steps/:stepId/comments', asyncH(executionController.getComments.bind(executionController)))

// Rotas de anexos/evidências em etapas
// Permissões: TESTER, MANAGER, ADMIN, OWNER podem fazer upload
router.post('/steps/:stepId/attachments', upload.single('file'), asyncH(executionController.uploadAttachment.bind(executionController)))
router.get('/steps/:stepId/attachments', asyncH(executionController.getAttachments.bind(executionController)))

// Rota para atualizar status da etapa
router.put('/execution/steps/:stepId/status', asyncH(executionController.updateStepStatusHandler.bind(executionController)))

// Rotas de bugs
// Permissões: TESTER, MANAGER, ADMIN, OWNER podem criar bugs
router.post('/scenarios/:scenarioId/bugs', asyncH(executionController.createBug.bind(executionController)))
router.get('/scenarios/:scenarioId/bugs', asyncH(executionController.getScenarioBugs.bind(executionController)))
router.get('/projects/:projectId/packages/:packageId/bugs', asyncH(executionController.getPackageBugsHandler.bind(executionController)))
router.put('/bugs/:bugId', asyncH(executionController.updateBugHandler.bind(executionController)))
router.delete('/bugs/:bugId', asyncH(executionController.deleteBugHandler.bind(executionController)))

// Rotas de histórico de execução
// Permissões: Qualquer membro do projeto pode ver o histórico
router.post('/scenarios/:scenarioId/history', asyncH(executionController.registerHistory.bind(executionController)))
router.get('/scenarios/:scenarioId/history', asyncH(executionController.getHistory.bind(executionController)))

export default router

