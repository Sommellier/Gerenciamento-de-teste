import { Request, Response, NextFunction } from 'express'
import { prisma } from './prisma'
import { AppError } from '../utils/AppError'
import { validateId } from '../utils/validation'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

// Definir permissões por role
const PERMISSIONS = {
  OWNER: ['*'], // Todas as permissões
  MANAGER: [
    'view_project',
    'create_package',
    'edit_package',
    'delete_package',
    'create_scenario',
    'edit_scenario',
    'delete_scenario',
    'execute_scenario',
    'create_bug',
    'comment',
    'upload_evidence',
    'change_scenario_status'
  ],
  TESTER: [
    'view_project',
    'execute_scenario',
    'create_bug',
    'comment',
    'upload_evidence'
  ],
  APPROVER: [
    'view_project',
    'comment',
    'change_scenario_status'
  ],
  VIEWER: [
    'view_project'
  ]
}

// Verificar se um role tem uma permissão específica
function hasPermission(role: string, permission: string): boolean {
  const rolePermissions = PERMISSIONS[role as keyof typeof PERMISSIONS] || []
  return rolePermissions.includes('*') || rolePermissions.includes(permission)
}

// Middleware para verificar permissões
export function requirePermission(permission: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id

      if (!userId) {
        throw new AppError('Não autenticado', 401)
      }

      // Extrair projectId dos parâmetros ou do body (verificar tanto projectId quanto id)
      const projectId = req.params.projectId || req.params.id || req.body.projectId

      if (!projectId) {
        // Se não houver projectId, permitir (será validado em outro lugar)
        return next()
      }

      // Buscar role do usuário no projeto
      const parsedProjectId = validateId(projectId, 'ID do projeto')
      const userOnProject = await prisma.userOnProject.findFirst({
        where: {
          userId,
          projectId: parsedProjectId
        }
      })

      // Verificar se é o dono do projeto
      const project = await prisma.project.findUnique({
        where: { id: parsedProjectId }
      })

      const isOwner = project?.ownerId === userId
      const role = isOwner ? 'OWNER' : (userOnProject?.role || 'APPROVER')

      // Verificar se tem a permissão
      if (!hasPermission(role, permission)) {
        throw new AppError('Permissão negada', 403)
      }

      // Adicionar role ao request para uso posterior
      (req as any).userRole = role

      next()
    } catch (error) {
      next(error)
    }
  }
}

// Middleware para verificar múltiplas permissões (qualquer uma)
export function requireAnyPermission(...permissions: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id

      if (!userId) {
        throw new AppError('Não autenticado', 401)
      }

      // Extrair projectId dos parâmetros ou do body (verificar tanto projectId quanto id)
      const projectId = req.params.projectId || req.params.id || req.body.projectId

      if (!projectId) {
        return next()
      }

      // Buscar role do usuário no projeto
      const parsedProjectId = validateId(projectId, 'ID do projeto')
      const userOnProject = await prisma.userOnProject.findFirst({
        where: {
          userId,
          projectId: parsedProjectId
        }
      })

      const project = await prisma.project.findUnique({
        where: { id: parsedProjectId }
      })

      const isOwner = project?.ownerId === userId
      const role = isOwner ? 'OWNER' : (userOnProject?.role || 'APPROVER')

      // Verificar se tem pelo menos uma das permissões
      const hasAnyPermission = permissions.some(perm => hasPermission(role, perm))

      if (!hasAnyPermission) {
        throw new AppError('Permissão negada', 403)
      }

      (req as any).userRole = role

      next()
    } catch (error) {
      next(error)
    }
  }
}

// Middleware para verificar se o usuário é membro do projeto
export async function requireProjectAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id

    if (!userId) {
      throw new AppError('Não autenticado', 401)
    }

    // Verificar tanto projectId quanto id (algumas rotas usam :id, outras :projectId)
    const projectId = req.params.projectId || req.params.id || req.body.projectId

    if (!projectId) {
      return next()
    }

    // Verificar se é dono ou membro
    const parsedProjectId = validateId(projectId, 'ID do projeto')
    const project = await prisma.project.findUnique({
      where: { id: parsedProjectId }
    })

    // Se o projeto não existe, permitir que o controller trate (retornará 404)
    if (!project) {
      return next()
    }

    const isOwner = project.ownerId === userId

    if (!isOwner) {
      const userOnProject = await prisma.userOnProject.findFirst({
        where: {
          userId,
          projectId: parsedProjectId
        }
      })

      if (!userOnProject) {
        throw new AppError('Acesso negado ao projeto', 403)
      }
    }

    next()
  } catch (error) {
    next(error)
  }
}

// Middleware para verificar acesso ao projeto através de stepId
export async function requireProjectAccessFromStep(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id

    if (!userId) {
      throw new AppError('Não autenticado', 401)
    }

    const stepId = req.params.stepId
    if (!stepId) {
      return next()
    }

    // Buscar step e obter projectId do cenário
    const step = await prisma.testScenarioStep.findUnique({
      where: { id: validateId(stepId, 'ID da etapa') },
      include: {
        scenario: {
          select: {
            projectId: true
          }
        }
      }
    })

    if (!step) {
      throw new AppError('Etapa não encontrada', 404)
    }

    // Verificar acesso ao projeto
    const project = await prisma.project.findUnique({
      where: { id: step.scenario.projectId }
    })

    const isOwner = project?.ownerId === userId

    if (!isOwner) {
      const userOnProject = await prisma.userOnProject.findFirst({
        where: {
          userId,
          projectId: step.scenario.projectId
        }
      })

      if (!userOnProject) {
        throw new AppError('Acesso negado ao projeto', 403)
      }
    }

    // Adicionar projectId ao request para uso posterior
    req.params.projectId = String(step.scenario.projectId)

    next()
  } catch (error) {
    next(error)
  }
}

// Middleware para verificar acesso ao projeto através de scenarioId
export async function requireProjectAccessFromScenario(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id

    if (!userId) {
      throw new AppError('Não autenticado', 401)
    }

    const scenarioId = req.params.scenarioId || req.params.id
    if (!scenarioId) {
      return next()
    }

    // Buscar cenário e obter projectId
    const scenario = await prisma.testScenario.findUnique({
      where: { id: validateId(scenarioId, 'ID do cenário') },
      select: {
        projectId: true
      }
    })

    if (!scenario) {
      throw new AppError('Cenário não encontrado', 404)
    }

    // Verificar acesso ao projeto
    const project = await prisma.project.findUnique({
      where: { id: scenario.projectId }
    })

    const isOwner = project?.ownerId === userId

    if (!isOwner) {
      const userOnProject = await prisma.userOnProject.findFirst({
        where: {
          userId,
          projectId: scenario.projectId
        }
      })

      if (!userOnProject) {
        throw new AppError('Acesso negado ao projeto', 403)
      }
    }

    // Adicionar projectId ao request para uso posterior
    req.params.projectId = String(scenario.projectId)

    next()
  } catch (error) {
    next(error)
  }
}

// Middleware para verificar acesso ao projeto através de packageId
export async function requireProjectAccessFromPackage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id

    if (!userId) {
      throw new AppError('Não autenticado', 401)
    }

    const packageId = req.params.packageId
    if (!packageId) {
      return next()
    }

    // Buscar pacote e obter projectId
    const testPackage = await prisma.testPackage.findUnique({
      where: { id: validateId(packageId, 'ID do pacote') },
      select: {
        projectId: true
      }
    })

    if (!testPackage) {
      throw new AppError('Pacote não encontrado', 404)
    }

    // Verificar acesso ao projeto
    const project = await prisma.project.findUnique({
      where: { id: testPackage.projectId }
    })

    const isOwner = project?.ownerId === userId

    if (!isOwner) {
      const userOnProject = await prisma.userOnProject.findFirst({
        where: {
          userId,
          projectId: testPackage.projectId
        }
      })

      if (!userOnProject) {
        throw new AppError('Acesso negado ao projeto', 403)
      }
    }

    // Adicionar projectId ao request para uso posterior
    req.params.projectId = String(testPackage.projectId)

    next()
  } catch (error) {
    next(error)
  }
}

// Middleware para verificar acesso ao projeto através de bugId
export async function requireProjectAccessFromBug(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id

    if (!userId) {
      throw new AppError('Não autenticado', 401)
    }

    const bugId = req.params.bugId
    if (!bugId) {
      return next()
    }

    // Buscar bug e obter projectId
    const bug = await prisma.bug.findUnique({
      where: { id: validateId(bugId, 'ID do bug') },
      select: {
        projectId: true
      }
    })

    if (!bug) {
      throw new AppError('Bug não encontrado', 404)
    }

    // Verificar acesso ao projeto
    const project = await prisma.project.findUnique({
      where: { id: bug.projectId }
    })

    const isOwner = project?.ownerId === userId

    if (!isOwner) {
      const userOnProject = await prisma.userOnProject.findFirst({
        where: {
          userId,
          projectId: bug.projectId
        }
      })

      if (!userOnProject) {
        throw new AppError('Acesso negado ao projeto', 403)
      }
    }

    // Adicionar projectId ao request para uso posterior
    req.params.projectId = String(bug.projectId)

    next()
  } catch (error) {
    next(error)
  }
}

