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

// Rota de teste para detalhes
router.get('/projects/:projectId/details-test', (req, res) => {
  const { projectId } = req.params
  res.json({
    id: parseInt(projectId),
    name: `Projeto ${projectId}`,
    description: 'Descrição do projeto de testes',
    ownerId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [{
      id: 1,
      name: 'Richard Schmitz Riedo',
      email: 'richardriedo87@gmail.com',
      avatar: null,
      role: 'OWNER'
    }],
    metrics: {
      created: 0,
      executed: 0,
      passed: 0,
      failed: 0
    },
    availableReleases: [],
    testPackages: [],
    scenarios: [],
    scenarioMetrics: {
      created: 0,
      executed: 0,
      passed: 0,
      failed: 0
    }
  })
})

router.post('/projects', auth, asyncH(createProjectController))
router.get('/projects', auth, asyncH(listProjects))
router.get('/projects/:id', auth, asyncH(getProjectByIdController))
router.get('/projects/:projectId/details', asyncH(getProjectDetailsController)) // Temporariamente sem auth
router.get('/projects/:projectId/releases', asyncH(getProjectReleasesController)) // Temporariamente sem auth
router.put('/projects/:id', auth, asyncH(updateProjectController))
router.delete('/projects/:id', auth, asyncH(deleteProjectController))

export default router
