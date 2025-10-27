import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { deleteUser } from '../../../application/use-cases/user/deleteUser.use-case'
import { AppError } from '../../../utils/AppError'

describe('deleteUser', () => {
  let user: any

  beforeEach(async () => {
    // Limpar dados de teste em ordem correta para evitar foreign key constraints
    await prisma.passwordResetToken.deleteMany()
    await prisma.userOnProject.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()

    // Criar usuário de teste
    user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password'
      }
    })
  })

  afterEach(async () => {
    // Limpar dados de teste em ordem correta para evitar foreign key constraints
    await prisma.passwordResetToken.deleteMany()
    await prisma.userOnProject.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('deleteUser - casos de sucesso', () => {
    it('deleta usuário existente', async () => {
      const result = await deleteUser(user.id.toString())

      expect(result).toBe(true)

      // Verificar se usuário foi deletado
      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      expect(deletedUser).toBeNull()
    })

    it('deleta usuário com ID como string numérica', async () => {
      const result = await deleteUser(user.id.toString())

      expect(result).toBe(true)

      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      expect(deletedUser).toBeNull()
    })

    it('deleta usuário com ID como número', async () => {
      const result = await deleteUser(user.id.toString())

      expect(result).toBe(true)

      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      expect(deletedUser).toBeNull()
    })
  })

  describe('deleteUser - casos de erro', () => {
    it('lança erro quando userId é inválido', async () => {
      await expect(deleteUser('invalid')).rejects.toThrow(AppError)
    })

    it('lança erro quando userId é NaN', async () => {
      await expect(deleteUser('abc')).rejects.toThrow(AppError)
    })

    it('lança erro quando userId é string vazia', async () => {
      await expect(deleteUser('')).rejects.toThrow(AppError)
    })

    it('lança erro quando userId é null', async () => {
      await expect(deleteUser(null as any)).rejects.toThrow(AppError)
    })

    it('lança erro quando userId é undefined', async () => {
      await expect(deleteUser(undefined as any)).rejects.toThrow(AppError)
    })

    it('lança erro quando usuário não existe', async () => {
      await expect(deleteUser('99999')).rejects.toThrow(AppError)
    })

    it('lança erro quando usuário não existe (ID negativo)', async () => {
      await expect(deleteUser('-1')).rejects.toThrow(AppError)
    })

    it('lança erro quando usuário não existe (ID zero)', async () => {
      await expect(deleteUser('0')).rejects.toThrow(AppError)
    })
  })

  describe('deleteUser - validações de entrada', () => {
    it('aceita ID como string numérica válida', async () => {
      const result = await deleteUser(user.id.toString())

      expect(result).toBe(true)
    })

    it('aceita ID com espaços (que serão convertidos para número)', async () => {
      const result = await deleteUser(`  ${user.id}  `)

      expect(result).toBe(true)
    })

    it('rejeita ID com caracteres não numéricos', async () => {
      await expect(deleteUser('123abc')).rejects.toThrow(AppError)
    })

    it('rejeita ID com símbolos', async () => {
      await expect(deleteUser('123!')).rejects.toThrow(AppError)
    })

    it('rejeita ID com pontos decimais', async () => {
      await expect(deleteUser('123.45')).rejects.toThrow(AppError)
    })

    it('rejeita ID com notação científica', async () => {
      await expect(deleteUser('1e3')).rejects.toThrow(AppError)
    })
  })

  describe('deleteUser - múltiplos usuários', () => {
    it('deleta apenas o usuário especificado', async () => {
      // Criar segundo usuário
      const secondUser = await prisma.user.create({
        data: {
          name: 'Second User',
          email: 'second@example.com',
          password: 'hashed_password'
        }
      })

      const result = await deleteUser(user.id.toString())

      expect(result).toBe(true)

      // Verificar se primeiro usuário foi deletado
      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })
      expect(deletedUser).toBeNull()

      // Verificar se segundo usuário ainda existe
      const remainingUser = await prisma.user.findUnique({
        where: { id: secondUser.id }
      })
      expect(remainingUser).toBeTruthy()
    })

    it('pode deletar múltiplos usuários sequencialmente', async () => {
      // Criar segundo usuário
      const secondUser = await prisma.user.create({
        data: {
          name: 'Second User',
          email: 'second@example.com',
          password: 'hashed_password'
        }
      })

      // Deletar primeiro usuário
      const result1 = await deleteUser(user.id.toString())
      expect(result1).toBe(true)

      // Deletar segundo usuário
      const result2 = await deleteUser(secondUser.id.toString())
      expect(result2).toBe(true)

      // Verificar se ambos foram deletados
      const allUsers = await prisma.user.findMany()
      expect(allUsers).toHaveLength(0)
    })
  })

  describe('deleteUser - relacionamentos', () => {
    it('deleta usuário mesmo tendo relacionamentos (cascade)', async () => {
      // Criar projeto do usuário
      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: user.id
        }
      })

      const result = await deleteUser(user.id.toString())

      expect(result).toBe(true)

      // Verificar se usuário foi deletado
      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id }
      })
      expect(deletedUser).toBeNull()

      // Verificar se projeto foi deletado (cascade)
      const deletedProject = await prisma.project.findUnique({
        where: { id: project.id }
      })
      expect(deletedProject).toBeNull()
    })
  })

  describe('deleteUser - edge cases', () => {
    it('retorna true mesmo se usuário já foi deletado', async () => {
      // Deletar usuário primeiro
      await deleteUser(user.id.toString())

      // Tentar deletar novamente deve lançar erro
      await expect(deleteUser(user.id.toString())).rejects.toThrow(AppError)
    })

    it('funciona com IDs muito grandes', async () => {
      const largeId = '999999999'
      await expect(deleteUser(largeId)).rejects.toThrow(AppError)
    })

    it('funciona com IDs muito pequenos', async () => {
      const smallId = '1'
      await expect(deleteUser(smallId)).rejects.toThrow(AppError)
    })
  })
})
