// src/routes/project.routes.ts
import { Router } from 'express'
import { createProjectController } from '../controllers/project/createProject.controller'
import { deleteProjectController } from '../controllers/project/deleteProject.controller'
import { updateProjectController } from '../controllers/project/updateProject.controller'
import { getProjectByIdController } from '../controllers/project/getProjectById.controller'
import { getProjectDetailsController } from '../controllers/project/getProjectDetails.controller'
import { listProjects } from '../controllers/project/listProjects.controller'
import auth from '../infrastructure/auth'

const asyncH =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next)

const router = Router()

// Rota temporária sem auth para testar
router.get('/projects-test', (req, res) => {
  res.json({
    items: [
      { id: 1, name: 'Projeto Teste 1', description: 'Descrição do projeto 1', createdAt: new Date().toISOString() },
      { id: 2, name: 'Projeto Teste 2', description: 'Descrição do projeto 2', createdAt: new Date().toISOString() },
      { id: 3, name: 'Projeto Teste 3', description: 'Descrição do projeto 3', createdAt: new Date().toISOString() }
    ],
    total: 3,
    page: 1,
    pageSize: 10,
    totalPages: 1
  })
})

router.post('/projects', auth, asyncH(createProjectController))
router.get('/projects', auth, asyncH(listProjects))
router.get('/projects/:id', auth, asyncH(getProjectByIdController))
router.get('/projects/:projectId/details', auth, asyncH(getProjectDetailsController))
router.put('/projects/:id', auth, asyncH(updateProjectController))
router.delete('/projects/:id', auth, asyncH(deleteProjectController))

export default router
