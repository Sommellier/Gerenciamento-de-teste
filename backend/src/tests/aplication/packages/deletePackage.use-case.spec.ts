// src/tests/aplication/packages/deletePackage.use-case.spec.ts
import 'dotenv/config'
import { beforeEach, afterAll, describe, expect, it, jest } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { deletePackage } from '../../../application/use-cases/packages/deletePackage.use-case'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { createProject } from '../../../application/use-cases/projetos/createProject.use-case'
import { createPackage } from '../../../application/use-cases/packages/createPackage.use-case'
import { AppError } from '../../../utils/AppError'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

let ownerId: number
let projectId: number
let packageId: number

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
    title: 'Test Package',
    type: 'FUNCTIONAL',
    priority: 'HIGH',
    tags: ['test'],
    release: '2024-01'
  })
  packageId = testPackage.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('deletePackage - casos de sucesso', () => {
  it('deleta pacote existente com sucesso', async () => {
    const result = await deletePackage({ packageId, projectId })

    expect(result).toEqual({
      message: 'Pacote deletado com sucesso'
    })

    // Verificar se o pacote foi realmente deletado
    const deletedPackage = await prisma.testPackage.findUnique({
      where: { id: packageId }
    })
    expect(deletedPackage).toBeNull()
  })

  it('deleta pacote mesmo que tenha steps associados', async () => {
    // Criar steps para o pacote
    await prisma.testPackageStep.createMany({
      data: [
        {
          packageId,
          action: 'Click button',
          expected: 'Page loads',
          stepOrder: 1
        },
        {
          packageId,
          action: 'Fill form',
          expected: 'Form submits',
          stepOrder: 2
        }
      ]
    })

    const result = await deletePackage({ packageId, projectId })

    expect(result).toEqual({
      message: 'Pacote deletado com sucesso'
    })

    // Verificar se o pacote e os steps foram deletados
    const deletedPackage = await prisma.testPackage.findUnique({
      where: { id: packageId }
    })
    expect(deletedPackage).toBeNull()

    const deletedSteps = await prisma.testPackageStep.findMany({
      where: { packageId }
    })
    expect(deletedSteps).toHaveLength(0)
  })
})

describe('deletePackage - validação de pacote', () => {
  it('rejeita quando pacote não existe', async () => {
    await expect(deletePackage({ 
      packageId: 999999, 
      projectId 
    })).rejects.toMatchObject({
      status: 404,
      message: 'Pacote não encontrado'
    })
  })

  it('rejeita quando pacote existe mas não pertence ao projeto', async () => {
    // Criar outro projeto
    const anotherProject = await createProject({
      ownerId,
      name: 'Another Project',
      description: 'Another Description',
    })

    // Criar pacote no outro projeto
    const anotherPackage = await createPackage({
      projectId: anotherProject.id,
      title: 'Another Package',
      type: 'FUNCTIONAL',
      priority: 'HIGH',
      tags: ['test'],
      release: '2024-01'
    })

    await expect(deletePackage({ 
      packageId: anotherPackage.id, 
      projectId 
    })).rejects.toMatchObject({
      status: 404,
      message: 'Pacote não encontrado'
    })
  })
})

describe('deletePackage - validação de parâmetros', () => {
  it.each([
    { packageId: undefined, projectId, desc: 'packageId undefined' },
    { packageId: null, projectId, desc: 'packageId null' },
    { packageId, projectId: undefined, desc: 'projectId undefined' },
    { packageId, projectId: null, desc: 'projectId null' }
  ])('rejeita quando $desc (erro do Prisma)', async ({ packageId: pkgId, projectId: projId }) => {
    await expect(deletePackage({ 
      packageId: pkgId as any, 
      projectId: projId as any 
    })).rejects.toThrow()
  })

  it.each([
    { packageId: 0, projectId, desc: 'packageId zero' },
    { packageId: -1, projectId, desc: 'packageId negativo' },
    { packageId: 1.5, projectId, desc: 'packageId não-inteiro' },
    { packageId: NaN, projectId, desc: 'packageId NaN' },
    { packageId, projectId: 0, desc: 'projectId zero' },
    { packageId, projectId: -1, desc: 'projectId negativo' },
    { packageId, projectId: 1.5, desc: 'projectId não-inteiro' },
    { packageId, projectId: NaN, desc: 'projectId NaN' }
  ])('rejeita quando $desc', async ({ packageId: pkgId, projectId: projId }) => {
    await expect(deletePackage({ 
      packageId: pkgId as any, 
      projectId: projId as any 
    })).rejects.toThrow()
  })
})

describe('deletePackage - casos de erro de integração', () => {
  it('falha quando pacote não existe', async () => {
    await expect(deletePackage({ 
      packageId: 999999, 
      projectId 
    })).rejects.toMatchObject({
      status: 404,
      message: 'Pacote não encontrado'
    })
  })
})

describe('deletePackage - verificação de integridade', () => {
  it('não afeta outros pacotes do mesmo projeto', async () => {
    // Criar outro pacote no mesmo projeto
    const anotherPackage = await createPackage({
      projectId,
      title: 'Another Package',
      type: 'REGRESSION',
      priority: 'MEDIUM',
      tags: ['regression'],
      release: '2024-02'
    })

    // Deletar o primeiro pacote
    await deletePackage({ packageId, projectId })

    // Verificar se o outro pacote ainda existe
    const remainingPackage = await prisma.testPackage.findUnique({
      where: { id: anotherPackage.id }
    })
    expect(remainingPackage).not.toBeNull()
    expect(remainingPackage!.title).toBe('Another Package')
  })

  it('não afeta pacotes de outros projetos', async () => {
    // Criar outro projeto e pacote
    const anotherProject = await createProject({
      ownerId,
      name: 'Another Project',
      description: 'Another Description',
    })

    const anotherPackage = await createPackage({
      projectId: anotherProject.id,
      title: 'Another Package',
      type: 'SMOKE',
      priority: 'LOW',
      tags: ['smoke'],
      release: '2024-03'
    })

    // Deletar pacote do primeiro projeto
    await deletePackage({ packageId, projectId })

    // Verificar se o pacote do outro projeto ainda existe
    const remainingPackage = await prisma.testPackage.findUnique({
      where: { id: anotherPackage.id }
    })
    expect(remainingPackage).not.toBeNull()
    expect(remainingPackage!.title).toBe('Another Package')
  })
})
