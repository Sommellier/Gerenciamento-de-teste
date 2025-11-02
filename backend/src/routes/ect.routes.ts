import { Router } from 'express'
import { ECTController } from '../controllers/ect.controller'
import { auth } from '../infrastructure/auth'

const router = Router()
const ectController = new ECTController()

// POST /api/scenarios/:id/ect - Gerar ECT para um cenário
router.post('/scenarios/:id/ect', auth, ectController.generateECT.bind(ectController))

// GET /api/reports/:id/download - Download de relatório
router.get('/reports/:id/download', auth, ectController.downloadReport.bind(ectController))

// POST /api/reports/:id/approve - Aprovar relatório ECT
router.post('/reports/:id/approve', auth, ectController.approveReport.bind(ectController))

// POST /api/reports/:id/reject - Reprovar relatório ECT
router.post('/reports/:id/reject', auth, ectController.rejectReport.bind(ectController))

export default router
