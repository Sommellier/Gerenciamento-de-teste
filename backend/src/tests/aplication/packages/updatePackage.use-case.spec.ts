// src/tests/aplication/packages/updatePackage.use-case.spec.ts
import 'dotenv/config'
import { beforeEach, afterAll, describe, expect, it, jest } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { updatePackage } from '../../../application/use-cases/packages/updatePackage.use-case'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { createProject } from '../../../application/use-cases/projetos/createProject.use-case'
import { createPackage } from '../../../application/use-cases/packages/createPackage.use-case'
import { AppError } from '../../../utils/AppError'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

let ownerId: number
let projectId: number
let packageId: number
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

  // Criar pacote de teste
  const testPackage = await createPackage({
    projectId,
    title: 'Original Package',
    description: 'Original Description',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    tags: ['original'],
    release: '2024-01'
  })
  packageId = testPackage.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('updatePackage - casos de sucesso', () => {
  it('atualiza campos básicos do pacote', async () => {
    const updateData = {
      packageId,
      projectId,
      title: 'Updated Package',
      description: 'Updated Description',
      type: 'REGRESSION' as const,
      priority: 'MEDIUM' as const,
      tags: ['updated'],
      environment: 'QA' as const,
      release: '2024-02',
      status: 'EXECUTED' as const
    }

    const result = await updatePackage(updateData)

    expect(result).toMatchObject({
      id: packageId,
      title: 'Updated Package',
      description: 'Updated Description',
      type: 'REGRESSION',
      priority: 'MEDIUM',
      tags: ['updated'],
      environment: 'QA',
      release: '2024-02',
      status: 'EXECUTED'
    })
  })

  it('atualiza apenas campos fornecidos', async () => {
    const updateData = {
      packageId,
      projectId,
      title: 'Only Title Updated'
    }

    const result = await updatePackage(updateData)

    expect(result).not.toBeNull()
    expect(result!.title).toBe('Only Title Updated')
    expect(result!.description).toBe('Original Description') // Não alterado
    expect(result!.type).toBe('FUNCTIONAL') // Não alterado
    expect(result!.priority).toBe('HIGH') // Não alterado
  })

  it('atualiza assignee por ID', async () => {
    const updateData = {
      packageId,
      projectId,
      assigneeId: userId
    }

    const result = await updatePackage(updateData)

    expect(result).not.toBeNull()
    expect(result!.assigneeEmail).toBeDefined()
    const user = await prisma.user.findUnique({ where: { id: userId } })
    expect(result!.assigneeEmail).toBe(user!.email)
  })

  it('atualiza assignee por email', async () => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    
    const updateData = {
      packageId,
      projectId,
      assigneeEmail: user!.email
    }

    const result = await updatePackage(updateData)

    expect(result).not.toBeNull()
    expect(result!.assigneeEmail).toBe(user!.email)
  })

  it('atualiza steps do pacote', async () => {
    const steps = [
      { action: 'Click button', expected: 'Page loads' },
      { action: 'Fill form', expected: 'Form submits' },
      { action: 'Verify result', expected: 'Success message' }
    ]

    const updateData = {
      packageId,
      projectId,
      steps
    }

    const result = await updatePackage(updateData)

    expect(result).not.toBeNull()
    expect(result!.steps).toHaveLength(3)
    expect(result!.steps[0]).toMatchObject({
      action: 'Click button',
      expected: 'Page loads',
      stepOrder: 1
    })
    expect(result!.steps[1]).toMatchObject({
      action: 'Fill form',
      expected: 'Form submits',
      stepOrder: 2
    })
    expect(result!.steps[2]).toMatchObject({
      action: 'Verify result',
      expected: 'Success message',
      stepOrder: 3
    })
  })

  it('substitui steps existentes por novos', async () => {
    // Criar steps iniciais
    await prisma.testPackageStep.createMany({
      data: [
        {
          packageId,
          action: 'Old action 1',
          expected: 'Old expected 1',
          stepOrder: 1
        },
        {
          packageId,
          action: 'Old action 2',
          expected: 'Old expected 2',
          stepOrder: 2
        }
      ]
    })

    const newSteps = [
      { action: 'New action 1', expected: 'New expected 1' },
      { action: 'New action 2', expected: 'New expected 2' },
      { action: 'New action 3', expected: 'New expected 3' }
    ]

    const updateData = {
      packageId,
      projectId,
      steps: newSteps
    }

    const result = await updatePackage(updateData)

    expect(result).not.toBeNull()
    expect(result!.steps).toHaveLength(3)
    expect(result!.steps[0].action).toBe('New action 1')
    expect(result!.steps[1].action).toBe('New action 2')
    expect(result!.steps[2].action).toBe('New action 3')

    // Verificar se os steps antigos foram removidos
    const oldSteps = await prisma.testPackageStep.findMany({
      where: { packageId, action: { contains: 'Old' } }
    })
    expect(oldSteps).toHaveLength(0)
  })
})

describe('updatePackage - validação de pacote', () => {
  it('rejeita quando pacote não existe', async () => {
    const updateData = {
      packageId: 999999,
      projectId,
      title: 'Updated Title'
    }

    await expect(updatePackage(updateData)).rejects.toMatchObject({
      status: 404,
      message: 'Pacote não encontrado'
    })
  })

  it('rejeita quando pacote existe mas não pertence ao projeto', async () => {
    // Criar outro projeto e pacote
    const anotherProject = await createProject({
      ownerId,
      name: 'Another Project',
      description: 'Another Description',
    })

    const anotherPackage = await createPackage({
      projectId: anotherProject.id,
      title: 'Another Package',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      tags: ['test'],
      release: '2024-01'
    })

    const updateData = {
      packageId: anotherPackage.id,
      projectId,
      title: 'Updated Title'
    }

    await expect(updatePackage(updateData)).rejects.toMatchObject({
      status: 404,
      message: 'Pacote não encontrado'
    })
  })
})

describe('updatePackage - validação de assignee', () => {
  it('rejeita quando assigneeId não existe', async () => {
    const updateData = {
      packageId,
      projectId,
      assigneeId: 999999
    }

    await expect(updatePackage(updateData)).rejects.toMatchObject({
      status: 404,
      message: 'Usuário responsável não encontrado'
    })
  })

  it('rejeita quando assigneeEmail não existe', async () => {
    const updateData = {
      packageId,
      projectId,
      assigneeEmail: 'nonexistent@example.com'
    }

    await expect(updatePackage(updateData)).rejects.toMatchObject({
      status: 404,
      message: 'Usuário responsável não encontrado'
    })
  })
})

describe('updatePackage - validação de release', () => {
  it('rejeita formatos inválidos de release', async () => {
    // Criar um pacote específico para este teste
    const testPackage = await createPackage({
      projectId,
      title: 'Test Package for Release Validation',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      tags: ['test'],
      release: '2024-01'
    })

    const invalidFormats = [
      { release: '2024-1', desc: 'mês com 1 dígito' },
      { release: '24-01', desc: 'ano com 2 dígitos' },
      { release: '2024/01', desc: 'formato com barra' },
      { release: '2024-13', desc: 'mês inválido' },
      { release: 'invalid', desc: 'formato inválido' },
      { release: '', desc: 'string vazia' }
    ]

    for (const testCase of invalidFormats) {
      const updateData = {
        packageId: testPackage.id,
        projectId,
        release: testCase.release
      }

      await expect(updatePackage(updateData)).rejects.toMatchObject({
        status: 400,
        message: 'Formato de release inválido. Use YYYY-MM'
      })
    }
  })

  it('aceita formato correto de release', async () => {
    const updateData = {
      packageId,
      projectId,
      release: '2024-02'
    }

    const result = await updatePackage(updateData)
    expect(result).not.toBeNull()
    expect(result!.release).toBe('2024-02')
  })
})

describe('updatePackage - validação de tipos', () => {
  it.each([
    { type: 'INVALID', desc: 'tipo inválido' },
    { type: 'functional', desc: 'minúsculo' },
    { type: 'Functional', desc: 'capitalizado' }
  ])('rejeita quando type é $desc ($type)', async ({ type }) => {
    const updateData = {
      packageId,
      projectId,
      type: type as any
    }

    await expect(updatePackage(updateData)).rejects.toThrow()
  })

  it.each([
    { priority: 'INVALID', desc: 'prioridade inválida' },
    { priority: 'high', desc: 'minúsculo' },
    { priority: 'High', desc: 'capitalizado' }
  ])('rejeita quando priority é $desc ($priority)', async ({ priority }) => {
    const updateData = {
      packageId,
      projectId,
      priority: priority as any
    }

    await expect(updatePackage(updateData)).rejects.toThrow()
  })

  it.each([
    { environment: 'INVALID', desc: 'ambiente inválido' },
    { environment: 'dev', desc: 'minúsculo' },
    { environment: 'Dev', desc: 'capitalizado' }
  ])('rejeita quando environment é $desc ($environment)', async ({ environment }) => {
    const updateData = {
      packageId,
      projectId,
      environment: environment as any
    }

    await expect(updatePackage(updateData)).rejects.toThrow()
  })

  it.each([
    { status: 'INVALID', desc: 'status inválido' },
    { status: 'created', desc: 'minúsculo' },
    { status: 'Created', desc: 'capitalizado' }
  ])('rejeita quando status é $desc ($status)', async ({ status }) => {
    const updateData = {
      packageId,
      projectId,
      status: status as any
    }

    await expect(updatePackage(updateData)).rejects.toThrow()
  })
})

describe('updatePackage - validação de parâmetros obrigatórios', () => {
  it.each([
    { packageId: undefined, projectId, desc: 'packageId undefined' },
    { packageId: null, projectId, desc: 'packageId null' },
    { packageId: 0, projectId, desc: 'packageId zero' },
    { packageId: -1, projectId, desc: 'packageId negativo' },
    { packageId: 1.5, projectId, desc: 'packageId não-inteiro' },
    { packageId: NaN, projectId, desc: 'packageId NaN' },
    { packageId, projectId: undefined, desc: 'projectId undefined' },
    { packageId, projectId: null, desc: 'projectId null' },
    { packageId, projectId: 0, desc: 'projectId zero' },
    { packageId, projectId: -1, desc: 'projectId negativo' },
    { packageId, projectId: 1.5, desc: 'projectId não-inteiro' },
    { packageId, projectId: NaN, desc: 'projectId NaN' }
  ])('rejeita quando $desc', async ({ packageId: pkgId, projectId: projId }) => {
    await expect(updatePackage({ 
      packageId: pkgId as any, 
      projectId: projId as any 
    })).rejects.toThrow()
  })
})

describe('updatePackage - casos especiais', () => {
  it('aceita array vazio de steps', async () => {
    const updateData = {
      packageId,
      projectId,
      steps: []
    }

    const result = await updatePackage(updateData)

    expect(result).not.toBeNull()
    expect(result!.steps).toHaveLength(0)
  })

  it('não atualiza steps quando não fornecidos', async () => {
    // Criar steps iniciais
    await prisma.testPackageStep.createMany({
      data: [
        {
          packageId,
          action: 'Existing action',
          expected: 'Existing expected',
          stepOrder: 1
        }
      ]
    })

    const updateData = {
      packageId,
      projectId,
      title: 'Updated Title'
    }

    const result = await updatePackage(updateData)

    expect(result).not.toBeNull()
    expect(result!.title).toBe('Updated Title')
    expect(result!.steps).toHaveLength(1)
    expect(result!.steps[0].action).toBe('Existing action')
  })

  it('atualiza tags corretamente', async () => {
    const updateData = {
      packageId,
      projectId,
      tags: ['new', 'updated', 'tags']
    }

    const result = await updatePackage(updateData)

    expect(result).not.toBeNull()
    expect(result!.tags).toEqual(['new', 'updated', 'tags'])
  })
})

describe('updatePackage - casos de erro de integração', () => {
  it('falha quando pacote não existe', async () => {
    const updateData = {
      packageId: 999999,
      projectId,
      title: 'Updated Title'
    }

    await expect(updatePackage(updateData)).rejects.toMatchObject({
      status: 404,
      message: 'Pacote não encontrado'
    })
  })
})
