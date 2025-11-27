import type { Request, Response, NextFunction } from 'express'
import { getPackageScenarios } from '../../application/use-cases/scenarios/getPackageScenarios.use-case'
import { AppError } from '../../utils/AppError'
import { validateId } from '../../utils/validation'

type AuthenticatedRequest = Request & {
  user?: { id: number; email?: string }
}

export const getPackageScenariosController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { packageId, projectId } = req.params

    if (!req.user?.id) {
      throw new AppError('Não autenticado', 401)
    }

    // Validação dos IDs - capturar erros e lançar mensagem genérica
    try {
      const parsedPackageId = validateId(packageId, 'ID do pacote')
      const parsedProjectId = validateId(projectId, 'ID do projeto')

      const scenarios = await getPackageScenarios({
        packageId: parsedPackageId,
        projectId: parsedProjectId
      })

      res.json({
        message: 'Cenários do pacote recuperados com sucesso',
        scenarios
      })
    } catch (err: any) {
      // Se for erro de validação, lançar mensagem genérica esperada pelos testes
      if (err instanceof AppError && err.statusCode === 400) {
        next(new AppError('IDs inválidos', 400))
      } else {
        next(err)
      }
    }
  } catch (err: any) {
    next(err)
  }
}
