import 'dotenv/config'
import { describe, it, beforeEach, afterAll, expect } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import { deleteUser } from '../../../application/use-cases/user/deleteUser.use-case'

// helper para e-mails únicos
const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

describe('Delete User', () => {
  let userId: number

  beforeEach(async () => {
    // LIMPEZA EM ORDEM (filhas → pais). Ajuste a lista conforme seu schema.
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany(),
      prisma.execution.deleteMany(),      // se Execution tiver FK p/ User
      prisma.userOnProject.deleteMany(),  // se tiver relação usuário-projeto
      prisma.testCase.deleteMany(),       // se test case guardar userId (se não, pode remover)
      prisma.project.deleteMany(),        // projetos do usuário (se necessário)
      prisma.user.deleteMany(),           // por último o User
    ])

    const newUser = await createUser({
      name: 'User to Delete',
      email: `${unique('delete')}@example.com`,
      password: 'securepassword',
    })

    userId = newUser.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should delete a user successfully', async () => {
    const deleted = await deleteUser(String(userId))
    expect(deleted).toBe(true)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    expect(user).toBeNull()
  })

  it('should throw error when trying to delete a non-existing user', async () => {
    await expect(deleteUser('-1')).rejects.toThrow('User not found')
  })

  it('should throw error for invalid (non-numeric) user ID', async () => {
    await expect(deleteUser('abc')).rejects.toThrow('Invalid user ID')
  })

  it('should not delete a user twice', async () => {
    await deleteUser(String(userId))
    await expect(deleteUser(String(userId))).rejects.toThrow('User not found')
  })
})
