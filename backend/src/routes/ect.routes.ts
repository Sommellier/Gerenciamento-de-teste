import { Router } from 'express'
import { ECTController } from '../controllers/ect.controller'
import { auth } from '../infrastructure/auth'

const router = Router()
const ectController = new ECTController()

// POST /api/scenarios/:id/ect - Gerar ECT para um cenário
router.post('/scenarios/:id/ect', auth, ectController.generateECT.bind(ectController))

// GET /api/reports/:id/download - Download de relatório
router.get('/reports/:id/download', auth, ectController.downloadReport.bind(ectController))

export default router
