import { Router } from 'express'
import { auth } from '../infrastructure/auth'
import { createPackageController } from '../controllers/packages/createPackage.controller'
import { getProjectPackagesController } from '../controllers/packages/getProjectPackages.controller'
import { updatePackageController } from '../controllers/packages/updatePackage.controller'
import { deletePackageController } from '../controllers/packages/deletePackage.controller'

const router = Router()

// Rotas para pacotes de teste
router.post('/projects/:projectId/packages', auth, createPackageController)
router.get('/projects/:projectId/packages', auth, getProjectPackagesController)
router.put('/projects/:projectId/packages/:packageId', auth, updatePackageController)
router.delete('/projects/:projectId/packages/:packageId', auth, deletePackageController)

export default router
