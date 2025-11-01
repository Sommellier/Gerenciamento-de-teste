import { Router } from 'express'
import { auth } from '../infrastructure/auth'
import { createPackageController } from '../controllers/packages/createPackage.controller'
import { getProjectPackagesController } from '../controllers/packages/getProjectPackages.controller'
import { getPackageDetailsController } from '../controllers/packages/getPackageDetails.controller'
import { updatePackageController } from '../controllers/packages/updatePackage.controller'
import { deletePackageController } from '../controllers/packages/deletePackage.controller'
import { createScenarioInPackageController } from '../controllers/scenarios/createScenarioInPackage.controller'
import { approvePackageController } from '../controllers/packages/approvePackage.controller'
import { rejectPackageController } from '../controllers/packages/rejectPackage.controller'
import { sendPackageToTestController } from '../controllers/packages/sendToTest.controller'
import { generatePackageECTController } from '../controllers/packages/generatePackageECT.controller'

const router = Router()

// Rotas para pacotes de teste
router.post('/projects/:projectId/packages', auth, createPackageController)
router.get('/projects/:projectId/packages', auth, getProjectPackagesController)
router.get('/projects/:projectId/packages/:packageId', auth, getPackageDetailsController)
router.put('/projects/:projectId/packages/:packageId', auth, updatePackageController)
router.delete('/projects/:projectId/packages/:packageId', auth, deletePackageController)

// Rotas de aprovação/reprovação
router.post('/projects/:projectId/packages/:packageId/approve', auth, approvePackageController)
router.post('/projects/:projectId/packages/:packageId/reject', auth, rejectPackageController)
router.post('/projects/:projectId/packages/:packageId/send-to-test', auth, sendPackageToTestController)

// Rota para gerar ECT do pacote
router.post('/projects/:projectId/packages/:packageId/ect', auth, generatePackageECTController)

// Rota para criar cenário dentro de um pacote
router.post('/projects/:projectId/packages/:packageId/scenarios', auth, createScenarioInPackageController)

export default router
