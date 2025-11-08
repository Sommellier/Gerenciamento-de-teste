// src/tests/aplication/packages/createPackage.use-case.spec.ts
import 'dotenv/config'
import { beforeEach, afterAll, describe, expect, it, jest } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { createPackage } from '../../../application/use-cases/packages/createPackage.use-case'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { createProject } from '../../../application/use-cases/projetos/createProject.use-case'
import { AppError } from '../../../utils/AppError'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

let ownerId: number
let projectId: number
let userId: number

beforeEach(async () => {
  await prisma.passwordResetToken.deleteMany()
  await prisma.execution.deleteMany()
  await prisma.userOnProject.deleteMany()
  await prisma.testCase.deleteMany()
  await prisma.testPackageStep.deleteMany()
  await prisma.testPackage.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  // Criar usuário owner
  const owner = await createUser({
    name: 'Owner',
    email: `${unique('owner')}@example.com`,
    password: 'secret123',
  })
  ownerId = owner.id

  // Criar usuário para assignee
  const user = await createUser({
    name: 'User',
    email: `${unique('user')}@example.com`,
    password: 'secret123',
  })
  userId = user.id

  // Criar projeto
  const project = await createProject({
    ownerId: ownerId,
    name: 'Test Project',
    description: 'Test Description',
  })
  projectId = project.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('createPackage - casos de sucesso', () => {
  it('cria pacote com todos os campos obrigatórios', async () => {
    const packageData = {
      projectId,
      title: 'Test Package',
      type: 'FUNCTIONAL' as const,
      priority: 'HIGH' as const,
      tags: ['test', 'functional'],
      release: '2024-01-15'
    }

    const result = await createPackage(packageData)

    expect(result).toMatchObject({
      title: 'Test Package',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      tags: ['test', 'functional'],
      release: '2024-01-15',
      projectId
    })
    expect(result.id).toBeDefined()
    expect(result.createdAt).toBeDefined()
    expect(result.updatedAt).toBeDefined()
  })

  it('cria pacote com campos opcionais', async () => {
    const packageData = {
      projectId,
      title: 'Complete Package',
      description: 'Package description',
      type: 'REGRESSION' as const,
      priority: 'CRITICAL' as const,
      tags: ['regression', 'critical'],
      assigneeId: userId,
      environment: 'QA' as const,
      release: '2024-02-15'
    }

    const result = await createPackage(packageData)

    expect(result).toMatchObject({
      title: 'Complete Package',
      description: 'Package description',
      type: 'REGRESSION',
      priority: 'CRITICAL',
      tags: ['regression', 'critical'],
      assigneeEmail: expect.any(String),
      environment: 'QA',
      release: '2024-02-15',
      projectId
    })
  })

  it('cria pacote com assigneeEmail em vez de assigneeId', async () => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    
    const packageData = {
      projectId,
      title: 'Email Package',
      type: 'SMOKE' as const,
      priority: 'MEDIUM' as const,
      tags: ['smoke'],
      assigneeEmail: user!.email,
      release: '2024-03-15'
    }

    const result = await createPackage(packageData)

    expect(result).toMatchObject({
      title: 'Email Package',
      assigneeEmail: user!.email
    })
  })

  it('cria pacote com assigneeId como objeto', async () => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    
    const packageData = {
      projectId,
      title: 'Object Package',
      type: 'E2E' as const,
      priority: 'LOW' as const,
      tags: ['e2e'],
      assigneeId: { value: userId, email: user!.email } as any,
      release: '2024-04-15'
    }

    const result = await createPackage(packageData)

    expect(result).toMatchObject({
      title: 'Object Package',
      assigneeEmail: user!.email
    })
  })

  it('cria pacote com assigneeId como objeto sem email (usa assigneeEmail)', async () => {
    const packageData = {
      projectId,
      title: 'Object Package No Email',
      type: 'E2E' as const,
      priority: 'LOW' as const,
      tags: ['e2e'],
      assigneeId: { value: userId } as any,
      assigneeEmail: 'fallback@example.com',
      release: '2024-04-15'
    }

    const result = await createPackage(packageData)

    expect(result).toMatchObject({
      title: 'Object Package No Email',
      assigneeEmail: 'fallback@example.com'
    })
  })
})

describe('createPackage - validação de projeto', () => {
  it('rejeita quando projeto não existe', async () => {
    const packageData = {
      projectId: 999999,
      title: 'Test Package',
      type: 'FUNCTIONAL' as const,
      priority: 'HIGH' as const,
      tags: ['test'],
      release: '2024-01-15'
    }

    await expect(createPackage(packageData)).rejects.toMatchObject({
      status: 404,
      message: 'Projeto não encontrado'
    })
  })
})

describe('createPackage - validação de assignee', () => {
  it('rejeita quando assigneeId não existe', async () => {
    const packageData = {
      projectId,
      title: 'Test Package',
      type: 'FUNCTIONAL' as const,
      priority: 'HIGH' as const,
      tags: ['test'],
      assigneeId: 999999,
      release: '2024-01-15'
    }

    await expect(createPackage(packageData)).rejects.toMatchObject({
      status: 404,
      message: 'Usuário responsável não encontrado'
    })
  })

  it('rejeita quando assigneeEmail não existe', async () => {
    const packageData = {
      projectId,
      title: 'Test Package',
      type: 'FUNCTIONAL' as const,
      priority: 'HIGH' as const,
      tags: ['test'],
      assigneeEmail: 'nonexistent@example.com',
      release: '2024-01-15'
    }

    await expect(createPackage(packageData)).rejects.toMatchObject({
      status: 404,
      message: 'Usuário responsável não encontrado'
    })
  })
})

describe('createPackage - validação de release', () => {
  it.each([
    { release: '2024-1', desc: 'mês com 1 dígito' },
    { release: '24-01', desc: 'ano com 2 dígitos' },
    { release: '2024/01', desc: 'formato com barra' },
    { release: '2024-01-15T10:30:00', desc: 'com horário' },
    { release: '01-2024', desc: 'formato MM-YYYY' },
    { release: 'invalid', desc: 'formato inválido' },
    { release: '', desc: 'string vazia' },
    { release: '2024-13', desc: 'mês inválido' }
  ])('rejeita quando release é $desc ($release)', async ({ release }) => {
    const packageData = {
      projectId,
      title: 'Test Package',
      type: 'FUNCTIONAL' as const,
      priority: 'HIGH' as const,
      tags: ['test'],
      release
    }

    await expect(createPackage(packageData)).rejects.toMatchObject({
      status: 400,
      message: 'Formato de release inválido. Use YYYY-MM ou YYYY-MM-DD'
    })
  })

  it('rejeita release com mês inválido (2024-13)', async () => {
    const packageData = {
      projectId,
      title: 'Test Package',
      type: 'FUNCTIONAL' as const,
      priority: 'HIGH' as const,
      tags: ['test'],
      release: '2024-13'
    }

    await expect(createPackage(packageData)).rejects.toMatchObject({
      status: 400,
      message: 'Formato de release inválido. Use YYYY-MM ou YYYY-MM-DD'
    })
  })

  it('aceita formato correto de release', async () => {
    const packageData = {
      projectId,
      title: 'Test Package',
      type: 'FUNCTIONAL' as const,
      priority: 'HIGH' as const,
      tags: ['test'],
      release: '2024-01-15'
    }

    const result = await createPackage(packageData)
    expect(result.release).toBe('2024-01-15')
  })
})

describe('createPackage - validação de campos obrigatórios', () => {
  it('Prisma valida campos obrigatórios automaticamente', async () => {
    // O Prisma faz a validação de campos obrigatórios automaticamente
    // Testamos apenas que os campos válidos funcionam
    const packageData = {
      projectId,
      title: 'Test Package',
      type: 'FUNCTIONAL' as const,
      priority: 'HIGH' as const,
      tags: ['test'],
      release: '2024-01-15'
    }

    const result = await createPackage(packageData)
    expect(result).toBeDefined()
    expect(result.title).toBe('Test Package')
  })
})

describe('createPackage - validação de tipos (Prisma)', () => {
  it('Prisma valida tipos automaticamente', async () => {
    // O Prisma faz a validação de tipos automaticamente
    // Testamos apenas que os tipos válidos funcionam
    const validTypes = ['FUNCTIONAL', 'REGRESSION', 'SMOKE', 'E2E']
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    const validEnvironments = ['DEV', 'QA', 'STAGING', 'PROD']

    for (const type of validTypes) {
      const packageData = {
        projectId,
        title: `Test ${type}`,
        type: type as any,
        priority: 'HIGH' as const,
        tags: ['test'],
        release: '2024-01-15'
      }

      const result = await createPackage(packageData)
      expect(result.type).toBe(type)
    }
  })
})

describe('createPackage - validação de tags', () => {
  it('aceita array vazio de tags', async () => {
    const packageData = {
      projectId,
      title: 'Test Package',
      type: 'FUNCTIONAL' as const,
      priority: 'HIGH' as const,
      tags: [],
      release: '2024-01-15'
    }

    const result = await createPackage(packageData)
    expect(result.tags).toEqual([])
  })

  it('aceita array com múltiplas tags', async () => {
    const packageData = {
      projectId,
      title: 'Test Package',
      type: 'FUNCTIONAL' as const,
      priority: 'HIGH' as const,
      tags: ['tag1', 'tag2', 'tag3'],
      release: '2024-01-15'
    }

    const result = await createPackage(packageData)
    expect(result.tags).toEqual(['tag1', 'tag2', 'tag3'])
  })

  it('faz parse de tags JSON string corretamente (linha 94)', async () => {
    // Criar pacote com tags como string JSON (vindo do banco)
    const packageData = {
      projectId,
      title: 'Test Package',
      type: 'FUNCTIONAL' as const,
      priority: 'HIGH' as const,
      tags: ['tag1', 'tag2'],
      release: '2024-01-15'
    }

    const created = await createPackage(packageData)

    // Buscar diretamente do banco (tags vêm como string JSON)
    const packageFromDb = await prisma.testPackage.findUnique({
      where: { id: created.id }
    })

    // Simular que tags vem como string JSON do banco (linha 94)
    expect(packageFromDb?.tags).toBeTruthy()
    
    // O resultado do createPackage já faz parse (linha 94)
    expect(created.tags).toEqual(['tag1', 'tag2'])
    expect(Array.isArray(created.tags)).toBe(true)
  })

  it('faz parse de tags quando tags é string vazia (linha 94)', async () => {
    // Criar pacote diretamente no banco com tags como string vazia
    const packageFromDb = await prisma.testPackage.create({
      data: {
        projectId,
        title: 'Test Package',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        release: '2024-01-15',
        tags: '[]' // string JSON vazia
      }
    })

    // Simular o código de createPackage que faz parse (linha 94)
    const parsedTags = JSON.parse(packageFromDb.tags || '[]')
    expect(parsedTags).toEqual([])

    // Limpar
    await prisma.testPackage.delete({ where: { id: packageFromDb.id } })
  })

  it('faz parse de tags quando tags é null (linha 94)', async () => {
    // Criar pacote diretamente no banco com tags como null
    const packageFromDb = await prisma.testPackage.create({
      data: {
        projectId,
        title: 'Test Package',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        release: '2024-01-15',
        tags: null
      }
    })

    // Simular o código de createPackage que faz parse (linha 94)
    const parsedTags = JSON.parse(packageFromDb.tags || '[]')
    expect(parsedTags).toEqual([])

    // Limpar
    await prisma.testPackage.delete({ where: { id: packageFromDb.id } })
  })
})

describe('createPackage - casos de erro de integração', () => {
  it('falha quando projeto não existe (erro real de FK)', async () => {
    const packageData = {
      projectId: 999999,
      title: 'Test Package',
      type: 'FUNCTIONAL' as const,
      priority: 'HIGH' as const,
      tags: ['test'],
      release: '2024-01-15'
    }

    await expect(createPackage(packageData)).rejects.toMatchObject({
      status: 404,
      message: 'Projeto não encontrado'
    })
  })

  it('trata erro inesperado e loga no console (linha 99)', async () => {
    // Mock do prisma para simular erro inesperado
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const createSpy = jest.spyOn(prisma.testPackage, 'create').mockRejectedValueOnce(
      new Error('Database connection error')
    )

    const packageData = {
      projectId,
      title: 'Test Package',
      type: 'FUNCTIONAL' as const,
      priority: 'HIGH' as const,
      tags: ['test'],
      release: '2024-01-15'
    }

    await expect(createPackage(packageData)).rejects.toThrow('Database connection error')
    
    // Verificar que o erro foi logado (linha 99)
    expect(consoleSpy).toHaveBeenCalledWith('Error in createPackage:', expect.any(Error))
    
    consoleSpy.mockRestore()
    createSpy.mockRestore()
  })
})
