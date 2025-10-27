import { Request, Response, NextFunction } from 'express'
import { prisma } from './prisma'
import { AppError } from '../utils/AppError'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

// Definir permissões por role
const PERMISSIONS = {
  OWNER: ['*'], // Todas as permissões
  ADMIN: ['*'], // Todas as permissões
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

      // Extrair projectId dos parâmetros ou do body
      const projectId = req.params.projectId || req.body.projectId

      if (!projectId) {
        // Se não houver projectId, permitir (será validado em outro lugar)
        return next()
      }

      // Buscar role do usuário no projeto
      const userOnProject = await prisma.userOnProject.findFirst({
        where: {
          userId,
          projectId: parseInt(projectId)
        }
      })

      // Verificar se é o dono do projeto
      const project = await prisma.project.findUnique({
        where: { id: parseInt(projectId) }
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

      // Extrair projectId dos parâmetros ou do body
      const projectId = req.params.projectId || req.body.projectId

      if (!projectId) {
        return next()
      }

      // Buscar role do usuário no projeto
      const userOnProject = await prisma.userOnProject.findFirst({
        where: {
          userId,
          projectId: parseInt(projectId)
        }
      })

      const project = await prisma.project.findUnique({
        where: { id: parseInt(projectId) }
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

    const projectId = req.params.projectId || req.body.projectId

    if (!projectId) {
      return next()
    }

    // Verificar se é dono ou membro
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) }
    })

    const isOwner = project?.ownerId === userId

    if (!isOwner) {
      const userOnProject = await prisma.userOnProject.findFirst({
        where: {
          userId,
          projectId: parseInt(projectId)
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

