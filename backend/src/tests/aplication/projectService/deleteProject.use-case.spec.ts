import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { deleteProject } from '../../../application/use-cases/projetos/deleteProject.use-case'
import { createProject } from '../../../application/use-cases/projetos/createProject.use-case'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

let ownerA: number
let ownerB: number
let projectId: number

async function expectAppError(promise: Promise<any>, status: number, msg?: RegExp) {
  await expect(promise).rejects.toMatchObject({
    status,
    message: expect.any(String),
  })
  if (msg) await promise.catch((e) => expect(String(e.message)).toMatch(msg))
}

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
    password: 'secret123'
  })
  const u2 = await createUser({
    name: 'Owner B',
    email: `${unique('ownB')}@example.com`,
    password: 'secret123'
  })

  ownerA = u1.id
  ownerB = u2.id

  const proj = await createProject({
    name: `Projeto ${unique('QA')}`,
    description: 'Projeto de testes',
    ownerId: ownerA
  })
  projectId = proj.id
  const tc = await prisma.testCase.create({
    data: {
      title: 'Caso 1',
      projectId,
      steps: 'Passo 1: Abrir o sistema',
      expected: 'O sistema deve abrir corretamente',
    },
  })

  await prisma.execution.create({
    data: {
      status: 'PENDING',
      testCase: { connect: { id: tc.id } },
      user: { connect: { id: ownerA } },
    },
  })

  await prisma.userOnProject.create({
    data: {
      userId: ownerA,
      projectId,
      role: 'OWNER',
    }
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('deleteProject.use-case', () => {
  it('deve excluir o projeto quando o solicitante é o dono', async () => {
    await deleteProject({ projectId, requesterId: ownerA })

    const exists = await prisma.project.findUnique({ where: { id: projectId } })
    expect(exists).toBeNull()

    const tcs = await prisma.testCase.findMany({ where: { projectId } })
    const exs = await prisma.execution.findMany({ where: { testCase: { projectId } } }) // <- ajuste
    const uops = await prisma.userOnProject.findMany({ where: { projectId } })

    expect(tcs.length).toBe(0)
    expect(exs.length).toBe(0)
    expect(uops.length).toBe(0)
  })

  it('deve falhar com 404 se o projeto não existir', async () => {
    await expectAppError(
      deleteProject({ projectId: 999999, requesterId: ownerA }),
      404,
      /não encontrado/i
    )
  })

  it('deve falhar com 403 se o solicitante não é o dono', async () => {
    await expectAppError(
      deleteProject({ projectId, requesterId: ownerB }),
      403,
      /permissão|excluir/i
    )
  })
})