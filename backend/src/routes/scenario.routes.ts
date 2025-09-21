import { Router } from 'express'
import { auth } from '../infrastructure/auth'
import { createScenarioController } from '../controllers/scenarios/createScenario.controller'
import { getProjectScenariosController } from '../controllers/scenarios/getProjectScenarios.controller'
import { getProjectMetricsController } from '../controllers/scenarios/getProjectMetrics.controller'
import { getProjectReleasesController } from '../controllers/scenarios/getProjectReleases.controller'
import { getProjectReleases } from '../application/use-cases/scenarios/getProjectReleases.use-case'
import { AppError } from '../utils/AppError'

const router = Router()

// Rota de teste sem auth
router.get('/test', (req, res) => {
  res.json({ message: 'Scenario routes working' })
})

// Rotas para cenários de teste
router.post('/projects/:projectId/scenarios', auth, createScenarioController)
router.get('/projects/:projectId/scenarios', auth, getProjectScenariosController)
router.get('/projects/:projectId/metrics', auth, getProjectMetricsController)

// Rotas temporárias sem auth para debug (movidas para o final)

// Rota para releases
router.get('/projects/:projectId/releases', auth, async (req: any, res) => {
  try {
    const { projectId } = req.params
    
    if (!req.user?.id) {
      res.status(401).json({ message: 'Não autenticado' })
      return
    }

    const releases = await getProjectReleases({ projectId: Number(projectId) })
    res.json(releases)
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message })
    } else {
      res.status(500).json({ message: 'Erro interno do servidor' })
    }
  }
})

// Rota temporária sem auth para releases (para debug)
router.get('/projects/:projectId/releases-debug', async (req: any, res) => {
  try {
    const { projectId } = req.params
    console.log('Debug releases route called for project:', projectId)
    
    const releases = await getProjectReleases({ projectId: Number(projectId) })
    res.json(releases)
  } catch (err) {
    console.error('Error in debug releases route:', err)
    res.status(500).json({ message: 'Erro interno do servidor' })
  }
})

export default router
