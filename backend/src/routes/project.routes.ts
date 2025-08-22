// src/routes/project.routes.ts
import { Router } from 'express'
import { createProjectController } from '../controllers/project/createProject.controller'
import { deleteProjectController } from '../controllers/project/deleteProject.controller'
import { updateProjectController } from '../controllers/project/updateProject.controller'
import { getProjectByIdController } from '../controllers/project/getProjectById.controller'
import { listProjects } from '../controllers/project/listProjects.use-case'

// se já tiver um auth real, importe-o daqui
// import { auth } from '../middleware/auth'

const auth = (_req: any, _res: any, next: any) => next()

const asyncH =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res)).catch(next)

const router = Router()

router.post('/projects', auth, asyncH(createProjectController))
router.get('/projects', auth, asyncH(listProjects))
router.get('/projects/:id', auth, asyncH(getProjectByIdController))
router.put('/projects/:id', auth, asyncH(updateProjectController))
router.delete('/projects/:id', auth, asyncH(deleteProjectController))

export default router
