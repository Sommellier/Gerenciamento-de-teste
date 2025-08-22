import 'dotenv/config'
import { beforeEach, afterAll, describe, expect, it, jest } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { Prisma } from '@prisma/client'
import { createProject } from '../../../application/use-cases/projetos/createProject.use-case'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { AppError } from '../../../utils/AppError'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

let ownerA: number
let ownerB: number

beforeEach(async () => {
  await prisma.passwordResetToken.deleteMany()
  await prisma.execution.deleteMany()
  await prisma.userOnProject.deleteMany()
  await prisma.testCase.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  const u1 = await createUser({
    name: 'Owner A',
    email: `${unique('ownA')}@example.com`,
    password: 'secret123',
  })
  const u2 = await createUser({
    name: 'Owner B',
    email: `${unique('ownB')}@example.com`,
    password: 'secret123',
  })
  ownerA = u1.id
  ownerB = u2.id
  const found = await prisma.user.findMany({ where: { id: { in: [ownerA, ownerB] } } })
  expect(found.map(u => u.id).sort()).toEqual([ownerA, ownerB].sort())
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('Project Creation', () => {
  it('cria projeto com nome/descrição aparados e persiste ownerId', async () => {
    const project = await createProject({
      ownerId: ownerA,
      name: '  Meu Projeto  ',
      description: '  desc  ',
    })
    expect(project.ownerId).toBe(ownerA)
    expect(project.name).toBe('Meu Projeto')
    expect(project.description).toBe('desc')
  })

  it('não permite nome duplicado para o mesmo dono (409) e mantém apenas 1 registro', async () => {
    await createProject({ ownerId: ownerA, name: 'Repetido', description: null })
    await expect(async () =>
      createProject({ ownerId: ownerA, name: 'Repetido', description: null })
    ).rejects.toMatchObject({ status: 409 })
    const count = await prisma.project.count({ where: { ownerId: ownerA, name: 'Repetido' } })
    expect(count).toBe(1)
  })

  it('permite mesmo nome para donos diferentes', async () => {
    await createProject({ ownerId: ownerA, name: 'MesmoNome', description: null })
    const p2 = await createProject({ ownerId: ownerB, name: 'MesmoNome', description: null })
    expect(p2.ownerId).toBe(ownerB)
  })

  it('salva description como null quando não informada (e aparada quando informada)', async () => {
    const p1 = await createProject({ ownerId: ownerA, name: 'SemDesc', description: undefined })
    expect(p1.description).toBeNull()
    const p2 = await createProject({ ownerId: ownerA, name: 'ComDesc', description: '  x  ' })
    expect(p2.description).toBe('x')
  })
})

it.each([
  { ownerId: undefined as unknown as number, label: 'undefined' },
  { ownerId: null as unknown as number, label: 'null' },
  { ownerId: 0, label: 'zero' },
  { ownerId: -1, label: 'negativo' },
  { ownerId: 1.5, label: 'não-inteiro' },
  { ownerId: NaN, label: 'NaN' },
])('rejeita quando ownerId é %s', async ({ ownerId, label }) => {
  const spyFindFirst = jest.spyOn(prisma.project, 'findFirst')
  const spyCreate = jest.spyOn(prisma.project, 'create')

  await expect(
    createProject({
      ownerId,
      name: 'Qualquer Nome Válido',
      description: 'desc',
    })
  ).rejects.toMatchObject({
    status: 400,
  })
  await expect(
    createProject({
      ownerId,
      name: 'Qualquer Nome Válido',
      description: 'desc',
    })
  ).rejects.toEqual(
    expect.any(AppError)
  )
  expect(spyFindFirst).not.toHaveBeenCalled()
  expect(spyCreate).not.toHaveBeenCalled()
})

it('aceita quando ownerId é inteiro positivo (passa da validação)', async () => {
  const fake = {
    id: 123,
    ownerId: 10,
    name: 'Projeto',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(null as any)
  jest.spyOn(prisma.project, 'create').mockResolvedValue(fake as any)

  const result = await createProject({ ownerId: 10, name: 'Projeto', description: undefined })
  expect(result).toEqual(fake)
})

describe('createProject - validação de name', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it.each([
    { name: undefined as unknown as string, label: 'undefined' },
    { name: null as unknown as string, label: 'null' },
    { name: 123 as unknown as string, label: 'number' },
    { name: {} as unknown as string, label: 'objeto' },
    { name: [] as unknown as string, label: 'array' },
    { name: true as unknown as string, label: 'boolean' },
  ])('rejeita quando name é %s', async ({ name, label }) => {
    const spyFind = jest.spyOn(prisma.project, 'findFirst')
    const spyCreate = jest.spyOn(prisma.project, 'create')

    await expect(
      createProject({ ownerId: 1, name, description: 'desc' })
    ).rejects.toMatchObject({ status: 400 })
    expect(spyFind).not.toHaveBeenCalled()
    expect(spyCreate).not.toHaveBeenCalled()
  })

  it('aceita quando name é string válida', async () => {
    const fake = {
      id: 1,
      ownerId: 1,
      name: 'Projeto Ok',
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(null as any)
    jest.spyOn(prisma.project, 'create').mockResolvedValue(fake as any)

    const result = await createProject({ ownerId: 1, name: 'Projeto Ok', description: null })
    expect(result).toEqual(fake)
  })
})

describe('createProject - validação tamanho mínimo do name', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it.each([
    { name: '', label: 'string vazia' },
    { name: ' ', label: 'apenas espaço' },
    { name: ' A ', label: '1 caractere com espaços' },
    { name: 'a', label: 'um caractere só' },
  ])('rejeita quando name é muito curto (%s)', async ({ name, label }) => {
    const spyFind = jest.spyOn(prisma.project, 'findFirst')
    const spyCreate = jest.spyOn(prisma.project, 'create')

    await expect(
      createProject({ ownerId: 1, name, description: null })
    ).rejects.toMatchObject({ status: 400 })

    expect(spyFind).not.toHaveBeenCalled()
    expect(spyCreate).not.toHaveBeenCalled()
  })

  it('aceita quando name tem pelo menos 2 caracteres úteis', async () => {
    const fake = {
      id: 1,
      ownerId: 1,
      name: 'Ok',
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(null as any)
    jest.spyOn(prisma.project, 'create').mockResolvedValue(fake as any)

    const result = await createProject({ ownerId: 1, name: ' Ok ', description: null })
    expect(result).toEqual(fake)
    expect(result.name).toBe('Ok') // garante que o trim foi aplicado
  })
})

describe('createProject - validação tamanho máximo do name', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('rejeita quando name tem mais de 100 caracteres', async () => {
    const tooLong = 'a'.repeat(101) // string de 101 caracteres

    const spyFind = jest.spyOn(prisma.project, 'findFirst')
    const spyCreate = jest.spyOn(prisma.project, 'create')

    await expect(
      createProject({ ownerId: 1, name: tooLong, description: null })
    ).rejects.toMatchObject({ status: 400 })

    expect(spyFind).not.toHaveBeenCalled()
    expect(spyCreate).not.toHaveBeenCalled()
  })

  it('aceita quando name tem exatamente 100 caracteres', async () => {
    const valid = 'b'.repeat(100)

    const fake = {
      id: 1,
      ownerId: 1,
      name: valid,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(null as any)
    jest.spyOn(prisma.project, 'create').mockResolvedValue(fake as any)

    const result = await createProject({ ownerId: 1, name: valid, description: null })
    expect(result).toEqual(fake)
    expect(result.name.length).toBe(100)
  })
})

describe('createProject - validação regex do name', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it.each([
    { name: 'Projeto123', desc: 'apenas letras e números' },
    { name: 'Projeto Ágil', desc: 'com espaço e acento' },
    { name: 'Release_v1.0', desc: 'underscore e ponto' },
    { name: 'Planejamento-QA', desc: 'hífen no meio' },
  ])('aceita quando name é válido (%s: %s)', async ({ name, desc }) => {
    const fake = {
      id: 1,
      ownerId: 1,
      name,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(null as any)
    jest.spyOn(prisma.project, 'create').mockResolvedValue(fake as any)

    const result = await createProject({ ownerId: 1, name, description: null })
    expect(result.name).toBe(name)
  })

  it.each([
    { name: 'Projeto@123', invalidChar: '@' },
    { name: 'Hello#World', invalidChar: '#' },
    { name: 'Test*Case', invalidChar: '*' },
    { name: 'Deploy!', invalidChar: '!' },
  ])('rejeita quando name contém caractere inválido (%s)', async ({ name, invalidChar }) => {
    const spyFind = jest.spyOn(prisma.project, 'findFirst')
    const spyCreate = jest.spyOn(prisma.project, 'create')

    await expect(
      createProject({ ownerId: 1, name, description: null })
    ).rejects.toMatchObject({ status: 400 })

    expect(spyFind).not.toHaveBeenCalled()
    expect(spyCreate).not.toHaveBeenCalled()
  })
})

function fakePrismaKnownError(code: string, message = 'prisma error') {
  // cria um objeto com code + prototype da KnownRequestError para passar no instanceof
  const err: any = new Error(message)
  err.code = code
  Object.setPrototypeOf(err, Prisma.PrismaClientKnownRequestError.prototype)
  return err as Prisma.PrismaClientKnownRequestError
}

describe('createProject - mapeamento de erros do Prisma', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('mapeia P2002 (unique constraint) para 409', async () => {
    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(null as any)
    jest
      .spyOn(prisma.project, 'create')
      .mockRejectedValue(fakePrismaKnownError('P2002', 'Unique constraint failed'))

    await expect(
      createProject({ ownerId: 1, name: 'Duplicado', description: null })
    ).rejects.toMatchObject({ status: 409 })
  })

  it('mapeia P2003 (FK violation) para 400', async () => {
    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(null as any)
    jest
      .spyOn(prisma.project, 'create')
      .mockRejectedValue(fakePrismaKnownError('P2003', 'Foreign key constraint failed'))

    await expect(
      createProject({ ownerId: 999999, name: 'Qualquer', description: null })
    ).rejects.toMatchObject({ status: 400 })
  })

  it('erros não mapeados viram 500 (Failed to create project)', async () => {
    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(null as any)
    jest
      .spyOn(prisma.project, 'create')
      .mockRejectedValue(new Error('algo inesperado'))

    await expect(
      createProject({ ownerId: 1, name: 'Falha Genérica', description: null })
    ).rejects.toMatchObject({ status: 500 })
  })
})

describe('createProject - normalização de description', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('salva description aparada quando string válida', async () => {
    const fake = { id: 1, ownerId: 1, name: 'Projeto', description: 'algo', createdAt: new Date(), updatedAt: new Date() }
    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(null as any)
    jest.spyOn(prisma.project, 'create').mockResolvedValue(fake as any)

    const result = await createProject({ ownerId: 1, name: 'Projeto', description: '  algo  ' })
    expect(result.description).toBe('algo')
  })

  it('salva como null quando string só com espaços', async () => {
    const fake = { id: 1, ownerId: 1, name: 'Projeto', description: null, createdAt: new Date(), updatedAt: new Date() }
    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(null as any)
    jest.spyOn(prisma.project, 'create').mockResolvedValue(fake as any)

    const result = await createProject({ ownerId: 1, name: 'Projeto', description: '   ' })
    expect(result.description).toBeNull()
  })

  it('salva como null quando undefined', async () => {
    const fake = { id: 1, ownerId: 1, name: 'Projeto', description: null, createdAt: new Date(), updatedAt: new Date() }
    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(null as any)
    jest.spyOn(prisma.project, 'create').mockResolvedValue(fake as any)

    const result = await createProject({ ownerId: 1, name: 'Projeto', description: undefined })
    expect(result.description).toBeNull()
  })

  it('salva como null quando null', async () => {
    const fake = { id: 1, ownerId: 1, name: 'Projeto', description: null, createdAt: new Date(), updatedAt: new Date() }
    jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(null as any)
    jest.spyOn(prisma.project, 'create').mockResolvedValue(fake as any)

    const result = await createProject({ ownerId: 1, name: 'Projeto', description: null })
    expect(result.description).toBeNull()
  })
})

it('mantém valor quando description não é string nem null/undefined', async () => {
  const fake = {
    id: 1,
    ownerId: 1,
    name: 'Projeto',
    description: 123 as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  jest.spyOn(prisma.project, 'findFirst').mockResolvedValue(null as any)
  jest.spyOn(prisma.project, 'create').mockResolvedValue(fake as any)

  const result = await createProject({ ownerId: 1, name: 'Projeto', description: 123 as any })
  expect(result.description).toBe(123)
})
