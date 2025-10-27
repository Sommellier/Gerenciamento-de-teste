import { Router } from 'express'
import { auth } from '../infrastructure/auth'
import { createPackageController } from '../controllers/packages/createPackage.controller'
import { getProjectPackagesController } from '../controllers/packages/getProjectPackages.controller'
import { getPackageDetailsController } from '../controllers/packages/getPackageDetails.controller'
import { updatePackageController } from '../controllers/packages/updatePackage.controller'
import { deletePackageController } from '../controllers/packages/deletePackage.controller'
import { createScenarioInPackageController } from '../controllers/scenarios/createScenarioInPackage.controller'

const router = Router()

// Rotas para pacotes de teste
router.post('/projects/:projectId/packages', auth, createPackageController)
router.get('/projects/:projectId/packages', auth, getProjectPackagesController)
router.get('/projects/:projectId/packages/:packageId', auth, getPackageDetailsController)
router.put('/projects/:projectId/packages/:packageId', auth, updatePackageController)
router.delete('/projects/:projectId/packages/:packageId', auth, deletePackageController)

// Rota para criar cenário dentro de um pacote (Temporariamente sem auth para debug)
router.post('/projects/:projectId/packages/:packageId/scenarios', createScenarioInPackageController)

// Rota temporária sem auth para debug
router.post('/projects/:projectId/packages-debug', createPackageController)

export default router
