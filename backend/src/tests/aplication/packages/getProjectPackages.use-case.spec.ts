// src/tests/aplication/packages/getProjectPackages.use-case.spec.ts
import 'dotenv/config'
import { beforeEach, afterAll, describe, expect, it, jest } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { getProjectPackages } from '../../../application/use-cases/packages/getProjectPackages.use-case'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { createProject } from '../../../application/use-cases/projetos/createProject.use-case'
import { createPackage } from '../../../application/use-cases/packages/createPackage.use-case'
import { AppError } from '../../../utils/AppError'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

let ownerId: number
let projectId: number
let anotherProjectId: number
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

  // Criar projetos
  const project = await createProject({
    ownerId: ownerId,
    name: 'Test Project',
    description: 'Test Description',
  })
  projectId = project.id

  const anotherProject = await createProject({
    ownerId: ownerId,
    name: 'Another Project',
    description: 'Another Description',
  })
  anotherProjectId = anotherProject.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('getProjectPackages - casos de sucesso', () => {
  it('retorna array vazio quando projeto não tem pacotes', async () => {
    const result = await getProjectPackages({ projectId })

    expect(result).toEqual([])
  })

  it('retorna todos os pacotes do projeto sem filtro de release', async () => {
    // Criar pacotes no projeto
    const package1 = await createPackage({
      projectId,
      title: 'Package 1',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      tags: ['test1'],
      release: '2024-01-15'
    })

    const package2 = await createPackage({
      projectId,
      title: 'Package 2',
      type: 'REGRESSION',
      priority: 'MEDIUM',
      tags: ['test2'],
      release: '2024-02-15'
    })

    // Criar pacote em outro projeto (não deve aparecer)
    await createPackage({
      projectId: anotherProjectId,
      title: 'Other Package',
      type: 'SMOKE',
      priority: 'LOW',
      tags: ['other'],
      release: '2024-03-15'
    })

    const result = await getProjectPackages({ projectId })

    expect(result).toHaveLength(2)
    expect(result.map(p => p.title)).toContain('Package 1')
    expect(result.map(p => p.title)).toContain('Package 2')
    expect(result.map(p => p.title)).not.toContain('Other Package')
  })

  it('retorna pacotes ordenados por createdAt desc', async () => {
    // Criar pacotes com delay para garantir ordem diferente
    const package1 = await createPackage({
      projectId,
      title: 'First Package',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      tags: ['test1'],
      release: '2024-01-15'
    })

    // Aguardar um pouco para garantir ordem temporal
    await new Promise(resolve => setTimeout(resolve, 10))

    const package2 = await createPackage({
      projectId,
      title: 'Second Package',
      type: 'REGRESSION',
      priority: 'MEDIUM',
      tags: ['test2'],
      release: '2024-02-15'
    })

    const result = await getProjectPackages({ projectId })

    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Second Package') // Mais recente primeiro
    expect(result[1].title).toBe('First Package')
  })

  it('retorna pacotes com steps incluídos e ordenados', async () => {
    const package1 = await createPackage({
      projectId,
      title: 'Package with Steps',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      tags: ['test'],
      release: '2024-01-15'
    })

    // Criar steps para o pacote
    await prisma.testPackageStep.createMany({
      data: [
        {
          packageId: package1.id,
          action: 'Click button',
          expected: 'Page loads',
          stepOrder: 1
        },
        {
          packageId: package1.id,
          action: 'Fill form',
          expected: 'Form submits',
          stepOrder: 2
        },
        {
          packageId: package1.id,
          action: 'Verify result',
          expected: 'Success message',
          stepOrder: 3
        }
      ]
    })

    const result = await getProjectPackages({ projectId })

    expect(result).toHaveLength(1)
    expect(result[0].steps).toHaveLength(3)
    expect(result[0].steps[0].stepOrder).toBe(1)
    expect(result[0].steps[1].stepOrder).toBe(2)
    expect(result[0].steps[2].stepOrder).toBe(3)
  })
})

describe('getProjectPackages - filtro por release', () => {
  beforeEach(async () => {
    // Criar pacotes com diferentes releases
    await createPackage({
      projectId,
      title: 'Package 2024-01',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      tags: ['test'],
      release: '2024-01-15'
    })

    await createPackage({
      projectId,
      title: 'Package 2024-02',
      type: 'REGRESSION',
      priority: 'MEDIUM',
      tags: ['test'],
      release: '2024-02-15'
    })

    await createPackage({
      projectId,
      title: 'Package 2024-03',
      type: 'SMOKE',
      priority: 'LOW',
      tags: ['test'],
      release: '2024-03-15'
    })
  })

  it('filtra pacotes por release específica', async () => {
    const result = await getProjectPackages({ 
      projectId, 
      release: '2024-02-15' 
    })

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Package 2024-02')
    expect(result[0].release).toBe('2024-02-15')
  })

  it('retorna array vazio quando release não existe', async () => {
    const result = await getProjectPackages({ 
      projectId, 
      release: '2024-12-15' 
    })

    expect(result).toEqual([])
  })

  it('retorna todos os pacotes quando release não é especificada', async () => {
    const result = await getProjectPackages({ projectId })

    expect(result).toHaveLength(3)
  })
})

describe('getProjectPackages - validação de projeto', () => {
  it('rejeita quando projeto não existe', async () => {
    await expect(getProjectPackages({ 
      projectId: 999999 
    })).rejects.toMatchObject({
      status: 404,
      message: 'Projeto não encontrado'
    })
  })

  it('rejeita quando projectId é inválido', async () => {
    await expect(getProjectPackages({ 
      projectId: 0 
    })).rejects.toMatchObject({
      status: 404,
      message: 'Projeto não encontrado'
    })

    await expect(getProjectPackages({ 
      projectId: -1 
    })).rejects.toMatchObject({
      status: 404,
      message: 'Projeto não encontrado'
    })
  })
})

describe('getProjectPackages - validação de parâmetros', () => {
  it.each([
    { projectId: undefined, desc: 'projectId undefined' },
    { projectId: null, desc: 'projectId null' },
    { projectId: 1.5, desc: 'projectId não-inteiro' },
    { projectId: NaN, desc: 'projectId NaN' }
  ])('rejeita quando $desc', async ({ projectId: projId }) => {
    await expect(getProjectPackages({ 
      projectId: projId as any 
    })).rejects.toThrow()
  })

  it('aceita release como string vazia', async () => {
    const result = await getProjectPackages({ 
      projectId, 
      release: '' 
    })

    expect(result).toEqual([])
  })

  it('aceita release como undefined', async () => {
    const result = await getProjectPackages({ 
      projectId, 
      release: undefined 
    })

    expect(result).toEqual([])
  })
})

describe('getProjectPackages - casos de erro de integração', () => {
  it('falha quando projeto não existe', async () => {
    await expect(getProjectPackages({ 
      projectId: 999999 
    })).rejects.toMatchObject({
      status: 404,
      message: 'Projeto não encontrado'
    })
  })
})

describe('getProjectPackages - casos especiais', () => {
  it('retorna pacotes mesmo quando alguns têm steps e outros não', async () => {
    const package1 = await createPackage({
      projectId,
      title: 'Package without Steps',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      tags: ['test'],
      release: '2024-01-15'
    })

    const package2 = await createPackage({
      projectId,
      title: 'Package with Steps',
      type: 'REGRESSION',
      priority: 'MEDIUM',
      tags: ['test'],
      release: '2024-02-15'
    })

    // Adicionar steps apenas ao segundo pacote
    await prisma.testPackageStep.create({
      data: {
        packageId: package2.id,
        action: 'Test action',
        expected: 'Expected result',
        stepOrder: 1
      }
    })

    const result = await getProjectPackages({ projectId })

    expect(result).toHaveLength(2)
    expect(result.find(p => p.title === 'Package without Steps')?.steps).toHaveLength(0)
    expect(result.find(p => p.title === 'Package with Steps')?.steps).toHaveLength(1)
  })

  it('retorna pacotes com diferentes tipos e prioridades', async () => {
    const packages = [
      { title: 'Functional', type: 'FUNCTIONAL', priority: 'HIGH' },
      { title: 'Regression', type: 'REGRESSION', priority: 'MEDIUM' },
      { title: 'Smoke', type: 'SMOKE', priority: 'LOW' },
      { title: 'E2E', type: 'E2E', priority: 'CRITICAL' }
    ]

    for (const pkg of packages) {
      await createPackage({
        projectId,
        title: pkg.title,
        type: pkg.type as any,
        priority: pkg.priority as any,
        tags: ['test'],
        release: '2024-01-15'
      })
    }

    const result = await getProjectPackages({ projectId })

    expect(result).toHaveLength(4)
    expect(result.map(p => p.type)).toContain('FUNCTIONAL')
    expect(result.map(p => p.type)).toContain('REGRESSION')
    expect(result.map(p => p.type)).toContain('SMOKE')
    expect(result.map(p => p.type)).toContain('E2E')
  })

  it('retorna pacotes com diferentes ambientes', async () => {
    const environments = ['DEV', 'QA', 'STAGING', 'PROD']

    for (const env of environments) {
      await createPackage({
        projectId,
        title: `Package ${env}`,
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        tags: ['test'],
        environment: env as any,
        release: '2024-01-15'
      })
    }

    const result = await getProjectPackages({ projectId })

    expect(result).toHaveLength(4)
    expect(result.map(p => p.environment)).toContain('DEV')
    expect(result.map(p => p.environment)).toContain('QA')
    expect(result.map(p => p.environment)).toContain('STAGING')
    expect(result.map(p => p.environment)).toContain('PROD')
  })
})
