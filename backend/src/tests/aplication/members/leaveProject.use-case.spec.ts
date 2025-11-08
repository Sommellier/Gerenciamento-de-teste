import 'dotenv/config'
import { beforeEach, afterAll, describe, expect, it } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { leaveProject } from '../../../application/use-cases/members/leaveProject.use-case'
import { AppError } from '../../../utils/AppError'

const unique = (p: string) =>
  `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

beforeEach(async () => {
  // limpa base (ordem segura por FKs)
  await prisma.passwordResetToken.deleteMany()
  await prisma.evidence.deleteMany()
  await prisma.execution.deleteMany()
  await prisma.userOnProject.deleteMany()
  await prisma.projectInvite.deleteMany()
  await prisma.testCase.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

async function seedBasic() {
  // usuários
  const owner = await prisma.user.create({
    data: { name: 'Owner', email: unique('own') + '@example.com', password: 'secret' }
  })
  const manager = await prisma.user.create({
    data: { name: 'Manager', email: unique('mgr') + '@example.com', password: 'secret' }
  })
  const tester = await prisma.user.create({
    data: { name: 'Tester', email: unique('tester') + '@example.com', password: 'secret' }
  })
  const approver = await prisma.user.create({
    data: { name: 'Approver', email: unique('appr') + '@example.com', password: 'secret' }
  })
  const outsider = await prisma.user.create({
    data: { name: 'Outsider', email: unique('out') + '@example.com', password: 'secret' }
  })

  // projeto + memberships
  const project = await prisma.project.create({
    data: { ownerId: owner.id, name: unique('Projeto'), description: null }
  })

  await prisma.userOnProject.create({ data: { projectId: project.id, userId: owner.id, role: 'OWNER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: manager.id, role: 'MANAGER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: tester.id, role: 'TESTER' } })
  await prisma.userOnProject.create({ data: { projectId: project.id, userId: approver.id, role: 'APPROVER' } })

  return { project, owner, manager, tester, approver, outsider }
}

describe('leaveProject.use-case', () => {
  describe('validação de parâmetros', () => {
    it('400 para projectId inválido (0)', async () => {
      await expect(leaveProject({ projectId: 0, userId: 1 }))
        .rejects.toMatchObject({ statusCode: 400, message: 'projectId inválido' })
    })

    it('400 para projectId inválido (negativo)', async () => {
      await expect(leaveProject({ projectId: -1, userId: 1 }))
        .rejects.toMatchObject({ statusCode: 400, message: 'projectId inválido' })
    })

    it('400 para userId inválido (0)', async () => {
      await expect(leaveProject({ projectId: 1, userId: 0 }))
        .rejects.toMatchObject({ statusCode: 400, message: 'userId inválido' })
    })

    it('400 para userId inválido (negativo)', async () => {
      await expect(leaveProject({ projectId: 1, userId: -1 }))
        .rejects.toMatchObject({ statusCode: 400, message: 'userId inválido' })
    })

    it('400 para projectId não inteiro', async () => {
      await expect(leaveProject({ projectId: 1.5 as any, userId: 1 }))
        .rejects.toMatchObject({ statusCode: 400, message: 'projectId inválido' })
    })

    it('400 para userId não inteiro', async () => {
      await expect(leaveProject({ projectId: 1, userId: 1.5 as any }))
        .rejects.toMatchObject({ statusCode: 400, message: 'userId inválido' })
    })
  })

  describe('casos de erro', () => {
    it('404 quando projeto não existe', async () => {
      const { tester } = await seedBasic()
      await expect(leaveProject({ projectId: 999_999, userId: tester.id }))
        .rejects.toMatchObject({ statusCode: 404, message: 'Projeto não encontrado' })
    })

    it('403 quando usuário é o dono do projeto', async () => {
      const { project, owner } = await seedBasic()
      await expect(leaveProject({ projectId: project.id, userId: owner.id }))
        .rejects.toMatchObject({ 
          statusCode: 403, 
          message: 'O dono do projeto não pode sair. Transfira a propriedade primeiro.' 
        })
    })

    it('404 quando usuário não é membro do projeto', async () => {
      const { project, outsider } = await seedBasic()
      await expect(leaveProject({ projectId: project.id, userId: outsider.id }))
        .rejects.toMatchObject({ statusCode: 404, message: 'Você não é membro deste projeto' })
    })
  })

  describe('casos de sucesso', () => {
    it('remove MANAGER do projeto com sucesso', async () => {
      const { project, manager } = await seedBasic()
      
      const result = await leaveProject({ projectId: project.id, userId: manager.id })
      
      expect(result).toMatchObject({
        projectId: project.id,
        userId: manager.id,
        role: 'MANAGER'
      })

      // Verificar se o membro foi removido
      const membership = await prisma.userOnProject.findUnique({
        where: { userId_projectId: { userId: manager.id, projectId: project.id } }
      })
      expect(membership).toBeNull()
    })

    it('remove TESTER do projeto com sucesso', async () => {
      const { project, tester } = await seedBasic()
      
      const result = await leaveProject({ projectId: project.id, userId: tester.id })
      
      expect(result).toMatchObject({
        projectId: project.id,
        userId: tester.id,
        role: 'TESTER'
      })

      // Verificar se o membro foi removido
      const membership = await prisma.userOnProject.findUnique({
        where: { userId_projectId: { userId: tester.id, projectId: project.id } }
      })
      expect(membership).toBeNull()
    })

    it('remove APPROVER do projeto com sucesso', async () => {
      const { project, approver } = await seedBasic()
      
      const result = await leaveProject({ projectId: project.id, userId: approver.id })
      
      expect(result).toMatchObject({
        projectId: project.id,
        userId: approver.id,
        role: 'APPROVER'
      })

      // Verificar se o membro foi removido
      const membership = await prisma.userOnProject.findUnique({
        where: { userId_projectId: { userId: approver.id, projectId: project.id } }
      })
      expect(membership).toBeNull()
    })

    it('remove múltiplos membros sequencialmente', async () => {
      const { project, manager, tester, approver } = await seedBasic()
      
      // Remover manager
      await leaveProject({ projectId: project.id, userId: manager.id })
      
      // Remover tester
      await leaveProject({ projectId: project.id, userId: tester.id })
      
      // Remover approver
      await leaveProject({ projectId: project.id, userId: approver.id })

      // Verificar que todos foram removidos
      const memberships = await prisma.userOnProject.findMany({
        where: { projectId: project.id }
      })
      
      // Apenas o owner deve permanecer
      expect(memberships).toHaveLength(1)
      expect(memberships[0].userId).toBe(project.ownerId)
    })
  })
})

