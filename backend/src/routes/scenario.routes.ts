import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { ScenarioController } from '../controllers/scenarios/scenario.controller'
import auth from '../infrastructure/auth'

const asyncH =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next)

const router = Router()
const scenarioController = new ScenarioController()

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/evidences/')
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
router.get('/packages/:packageId/scenarios', auth, asyncH(scenarioController.getPackageScenarios.bind(scenarioController)))
router.post('/packages/:packageId/scenarios', auth, asyncH(scenarioController.createScenario.bind(scenarioController)))

// Rotas para cenários individuais
router.get('/scenarios/:id', auth, asyncH(scenarioController.getScenarioById.bind(scenarioController)))
router.put('/scenarios/:id', auth, asyncH(scenarioController.updateScenario.bind(scenarioController)))
router.delete('/scenarios/:id', auth, asyncH(scenarioController.deleteScenario.bind(scenarioController)))

// Rotas para execução de cenários
router.post('/scenarios/:id/executions', auth, asyncH(scenarioController.executeScenario.bind(scenarioController)))
router.post('/scenarios/:id/duplicate', auth, asyncH(scenarioController.duplicateScenario.bind(scenarioController)))

// Rotas para evidências
router.post('/scenarios/:id/evidences', auth, upload.single('file'), asyncH(scenarioController.uploadEvidence.bind(scenarioController)))

// Rotas para exportação
router.get('/packages/:packageId/scenarios/export.csv', auth, asyncH(scenarioController.exportScenariosToCSV.bind(scenarioController)))
router.get('/packages/:packageId/scenarios/report.pdf', auth, asyncH(scenarioController.generateScenarioReport.bind(scenarioController)))

export default router