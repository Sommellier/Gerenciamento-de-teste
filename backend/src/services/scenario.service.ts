import { prisma } from '../infrastructure/prisma'
import { AppError } from '../utils/AppError'
import { CreateScenarioData, UpdateScenarioData, ExecuteScenarioData, ScenarioFilters } from '../schemas/scenario.schema'
import crypto from 'crypto'

export class ScenarioService {
  // Listar cenários de um pacote com filtros
  async getPackageScenarios(packageId: number, filters: ScenarioFilters, userId: number) {
    // Verificar se o usuário tem acesso ao pacote
    const packageAccess = await this.checkPackageAccess(packageId, userId)
    if (!packageAccess) {
      throw new AppError('Acesso negado ao pacote', 403)
    }

    const { page = 1, pageSize = 20, sort = 'createdAt', sortOrder = 'desc', ...searchFilters } = filters
    const skip = (page - 1) * pageSize

    // Construir filtros de busca
    const where: any = {
      packageId,
      ...(searchFilters.status && { status: searchFilters.status }),
      ...(searchFilters.type && { type: searchFilters.type }),
      ...(searchFilters.priority && { priority: searchFilters.priority }),
      ...(searchFilters.owner && { ownerUserId: searchFilters.owner }),
      ...(searchFilters.tag && { 
        tags: { 
          contains: searchFilters.tag 
        } 
      }),
      ...(searchFilters.q && {
        OR: [
          { title: { contains: searchFilters.q } },
          { description: { contains: searchFilters.q } }
        ]
      })
    }

    const [scenarios, total] = await Promise.all([
      prisma.testScenario.findMany({
        where,
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' }
          },
          testador: {
            select: { id: true, name: true, email: true }
          },
          aprovador: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { [sort as string]: sortOrder },
        skip,
        take: pageSize
      }),
      prisma.testScenario.count({ where })
    ])

    return {
      scenarios,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  }

  // Criar novo cenário
  async createScenario(packageId: number, data: CreateScenarioData, userId: number) {
    // Verificar acesso ao pacote
    const packageAccess = await this.checkPackageAccess(packageId, userId)
    if (!packageAccess) {
      throw new AppError('Acesso negado ao pacote', 403)
    }

    // Verificar se o pacote está aprovado e bloquear criação
    const testPackage = await prisma.testPackage.findUnique({
      where: { id: packageId }
    })

    if (testPackage?.status === 'APROVADO') {
      throw new AppError('Não é possível criar cenários em um pacote aprovado', 403)
    }

    // Validar se o testadorId existe (se fornecido)
    if (data.testadorId) {
      const testador = await prisma.user.findUnique({
        where: { id: data.testadorId }
      })
      if (!testador) {
        throw new AppError('Testador não encontrado', 400)
      }
    }

    // Validar se o aprovadorId existe (se fornecido)
    if (data.aprovadorId) {
      const aprovador = await prisma.user.findUnique({
        where: { id: data.aprovadorId }
      })
      if (!aprovador) {
        throw new AppError('Aprovador não encontrado', 400)
      }
    }

    // Validar se o ownerUserId existe (se fornecido)
    if (data.ownerUserId) {
      const owner = await prisma.user.findUnique({
        where: { id: data.ownerUserId }
      })
      if (!owner) {
        throw new AppError('Owner não encontrado', 400)
      }
    }

    // Criar cenário com steps opcionais
    const scenario = await prisma.testScenario.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        testadorId: data.testadorId,
        aprovadorId: data.aprovadorId,
        packageId,
        projectId: packageAccess.projectId,
        ...(data.steps && data.steps.length > 0 && {
          steps: {
            create: data.steps.map((step, index) => ({
              action: step.action,
              expected: step.expected,
              stepOrder: step.order || index + 1
            }))
          }
        })
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        },
        testador: {
          select: { id: true, name: true, email: true }
        },
        aprovador: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return scenario
  }

  // Obter cenário por ID
  async getScenarioById(scenarioId: number, userId: number) {
    const scenario = await prisma.testScenario.findUnique({
      where: { id: scenarioId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        },
        testador: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        aprovador: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        package: {
          select: { id: true, title: true }
        },
        project: {
          select: { id: true, name: true, ownerId: true }
        },
        reports: {
          include: {
            approval: {
              include: {
                approver: {
                  select: { id: true, name: true, email: true, avatar: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!scenario) {
      console.error('🔴 [getScenarioById] Cenário não encontrado:', scenarioId)
      throw new AppError('Cenário não encontrado', 404)
    }

    // Verificar acesso
    const packageAccess = await this.checkPackageAccess(scenario.packageId!, userId)
    if (!packageAccess) {
      throw new AppError('Acesso negado ao cenário', 403)
    }

    return scenario
  }

  // Atualizar cenário
  async updateScenario(scenarioId: number, data: UpdateScenarioData, userId: number) {
    const scenario = await this.getScenarioById(scenarioId, userId)

    // Atualizar dados do cenário
    const updateData: any = {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.type && { type: data.type }),
      ...(data.priority && { priority: data.priority }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.tags !== undefined && { 
        tags: data.tags ? JSON.stringify(data.tags) : null 
      }),
      ...(data.testadorId !== undefined && { testadorId: data.testadorId }),
      ...(data.aprovadorId !== undefined && { aprovadorId: data.aprovadorId })
    }

    // Se steps foram fornecidos, atualizar steps
    if (data.steps && Array.isArray(data.steps)) {
      // Deletar steps existentes
      await prisma.testScenarioStep.deleteMany({
        where: { scenarioId }
      })

      // Criar novos steps se fornecidos
      if (data.steps.length > 0) {
        updateData.steps = {
          create: data.steps.map((step, index) => ({
            action: step.action,
            expected: step.expected,
            stepOrder: step.order || index + 1
          }))
        }
      }
    }

    const updatedScenario = await prisma.testScenario.update({
      where: { id: scenarioId },
      data: updateData,
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        },
        testador: {
          select: { id: true, name: true, email: true }
        },
        aprovador: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return updatedScenario
  }

  // Executar cenário
  async executeScenario(scenarioId: number, data: ExecuteScenarioData, userId: number) {
    const scenario = await this.getScenarioById(scenarioId, userId)

    // TODO: Implementar execução de cenário quando o modelo estiver disponível
    // const lastExecution = await prisma.scenarioExecution.findFirst({
    //   where: { scenarioId },
    //   orderBy: { runNumber: 'desc' }
    // })
    // const runNumber = (lastExecution?.runNumber || 0) + 1

    // const execution = await prisma.scenarioExecution.create({
    //   data: {
    //     status: data.status,
    //     runNumber,
    //     notes: data.notes,
    //     userId,
    //     scenarioId
    //   },
    //   include: {
    //     user: {
    //       select: { id: true, name: true, email: true }
    //     }
    //   }
    // })

    // Placeholder para execução
    const execution = { id: 1, status: data.status, notes: data.notes }

    // Atualizar status do cenário baseado na execução
    const newStatus = data.status === 'PASSED' ? 'PASSED' : 
                     data.status === 'FAILED' ? 'FAILED' : 'EXECUTED'
    
    await prisma.testScenario.update({
      where: { id: scenarioId },
      data: { status: newStatus }
    })

    return execution
  }

  // Duplicar cenário
  async duplicateScenario(scenarioId: number, userId: number) {
    const originalScenario = await this.getScenarioById(scenarioId, userId)

    const duplicatedScenario = await prisma.testScenario.create({
      data: {
        title: `${originalScenario.title} (Cópia)`,
        description: originalScenario.description,
        type: originalScenario.type,
        priority: originalScenario.priority,
        tags: originalScenario.tags,
        testadorId: originalScenario.testadorId,
        aprovadorId: originalScenario.aprovadorId,
        packageId: originalScenario.packageId,
        projectId: originalScenario.projectId,
        status: 'CREATED',
        ...(originalScenario.steps && originalScenario.steps.length > 0 && {
          steps: {
            create: originalScenario.steps.map(step => ({
              action: step.action,
              expected: step.expected,
              stepOrder: step.stepOrder
            }))
          }
        })
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        },
        testador: {
          select: { id: true, name: true, email: true }
        },
        aprovador: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return duplicatedScenario
  }

  // Deletar cenário
  async deleteScenario(scenarioId: number, userId: number) {
    const scenario = await this.getScenarioById(scenarioId, userId)

    await prisma.testScenario.delete({
      where: { id: scenarioId }
    })

    return { message: 'Cenário deletado com sucesso' }
  }

  // Upload de evidência
  async uploadEvidence(scenarioId: number, file: Express.Multer.File, userId: number) {
    const scenario = await this.getScenarioById(scenarioId, userId)

    // Validar tipo de arquivo
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/json',
      'video/mp4', 'video/webm'
    ]
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError('Tipo de arquivo não permitido', 400)
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new AppError('Arquivo muito grande. Máximo 5MB', 400)
    }

    // Gerar checksum
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex')

    // TODO: Implementar salvamento de evidência quando o modelo estiver disponível
    // const evidence = await prisma.scenarioEvidence.create({
    //   data: {
    //     filename: file.filename,
    //     originalName: file.originalname,
    //     mimeType: file.mimetype,
    //     size: file.size,
    //     storageUrl: file.path,
    //     checksum,
    //     scenarioId,
    //     uploadedBy: userId
    //   },
    //   include: {
    //     uploadedByUser: {
    //       select: { id: true, name: true, email: true }
    //     }
    //   }
    // })

    // Placeholder para evidência
    const evidence = { 
      id: 1, 
      filename: file.filename, 
      originalName: file.originalname,
      uploadedByUser: { id: userId, name: 'User', email: 'user@example.com' }
    }

    return evidence
  }

  // Exportar cenários para CSV
  async exportScenariosToCSV(packageId: number, userId: number) {
    const packageAccess = await this.checkPackageAccess(packageId, userId)
    if (!packageAccess) {
      throw new AppError('Acesso negado ao pacote', 403)
    }

    const scenarios = await prisma.testScenario.findMany({
      where: { packageId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' }
        }
        // TODO: Adicionar executions quando o modelo estiver disponível
      },
      orderBy: { title: 'asc' }
    })

    // Gerar CSV
    const csvHeaders = [
      'ID', 'Título', 'Descrição', 'Tipo', 'Prioridade', 'Severidade',
      'Módulo', 'Ambiente', 'Responsável', 'Data Vencimento', 'Status',
      'Tags', 'Pré-condições', 'Número de Passos', 'Última Execução',
      'Resultado Última Execução', 'Executado Por'
    ]

    const csvRows = scenarios.map(scenario => {
      const tags = scenario.tags ? JSON.parse(scenario.tags).join('; ') : ''
      // const preconditions = scenario.preconditions ? JSON.parse(scenario.preconditions).join('; ') : ''
      // const lastExecution = scenario.executions?.[0]
      const lastExecution = null // Placeholder até o modelo estar disponível
      
      return [
        scenario.id,
        scenario.title,
        scenario.description || '',
        scenario.type,
        scenario.priority,
        '', // scenario.severity || '',
        '', // scenario.module || '',
        '', // scenario.environment || '',
        '', // scenario.owner?.name || '',
        '', // scenario.dueDate?.toISOString().split('T')[0] || '',
        scenario.status,
        tags,
        '', // preconditions,
        scenario.steps?.length || 0,
        '', // lastExecution?.createdAt?.toISOString().split('T')[0] || '',
        '', // lastExecution?.status || '',
        '' // lastExecution?.user?.name || ''
      ]
    })

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    return csvContent
  }

  // Verificar acesso ao pacote
  async checkPackageAccess(packageId: number, userId: number) {
    const packageWithProject = await prisma.testPackage.findUnique({
      where: { id: packageId },
      include: {
        project: {
          include: {
            userProjects: {
              where: { userId }
            }
          }
        }
      }
    })

    if (!packageWithProject) {
      return null
    }

    const project = packageWithProject.project
    const isOwner = project.ownerId === userId
    const isMember = project.userProjects.length > 0

    // Verificar se o usuário tem acesso ao projeto
    return isOwner || isMember ? { projectId: project.id } : null
  }
}
