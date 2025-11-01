// src/routes/project.routes.ts
import { Router } from 'express'
import { createProjectController } from '../controllers/project/createProject.controller'
import { deleteProjectController } from '../controllers/project/deleteProject.controller'
import { updateProjectController } from '../controllers/project/updateProject.controller'
import { getProjectByIdController } from '../controllers/project/getProjectById.controller'
import { getProjectDetailsController } from '../controllers/project/getProjectDetails.controller'
import { listProjects } from '../controllers/project/listProjects.controller'
import { getProjectReleasesController } from '../controllers/scenarios/getProjectReleases.controller'
import auth from '../infrastructure/auth'

const asyncH =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next)

const router = Router()

router.post('/projects', auth, asyncH(createProjectController))
router.get('/projects', auth, asyncH(listProjects))
router.get('/projects/:id', auth, asyncH(getProjectByIdController))
router.get('/projects/:projectId/details', auth, asyncH(getProjectDetailsController))
router.get('/projects/:projectId/releases', auth, asyncH(getProjectReleasesController))
router.put('/projects/:id', auth, asyncH(updateProjectController))
router.delete('/projects/:id', auth, asyncH(deleteProjectController))

export default router
