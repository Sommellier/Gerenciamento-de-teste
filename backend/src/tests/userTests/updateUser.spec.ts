import 'dotenv/config'
import { prisma } from '../../infrastructure/prisma'
import { createUser } from '../../application/use-cases/user/createUser.use-case'
import { updateUser } from '../../application/use-cases/user/updateUser.use-case'
import bcrypt from 'bcrypt'

describe('Update User', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany()
  })

  it('should update name and email', async () => {
    const user = await createUser({
      name: 'Original Name',
      email: `original_${Date.now()}@example.com`,
      password: 'originalPassword123'
    })

    const updated = await updateUser(user.id.toString(), {
      name: 'Updated Name',
      email: 'updated@example.com'
    })

    expect(updated.name).toBe('Updated Name')
    expect(updated.email).toBe('updated@example.com')
  })

  it('should update password and hash it', async () => {
    const user = await createUser({
      name: 'Hash User',
      email: `hash_${Date.now()}@example.com`,
      password: 'initialPass123'
    })

    await updateUser(user.id.toString(), { password: 'newPassword123' })

    const userInDb = await prisma.user.findUnique({ where: { id: user.id } })
    expect(userInDb).not.toBeNull()
    expect(userInDb!.password).not.toBe('newPassword123')

    const isHashed = await bcrypt.compare('newPassword123', userInDb!.password)
    expect(isHashed).toBe(true)
  })

  it('should throw error if user not found', async () => {
    await expect(updateUser('-1', { name: 'Ghost' }))
      .rejects.toThrow('User not found')
  })

  it('should throw error if email already exists', async () => {
    const firstUser = await createUser({
      name: 'User One',
      email: `dupe_${Date.now()}@example.com`,
      password: 'pass12345'
    })

    const secondUser = await createUser({
      name: 'User Two',
      email: `dupe_target_${Date.now()}@example.com`,
      password: 'pass45645'
    })

    await expect(updateUser(secondUser.id.toString(), { email: firstUser.email }))
      .rejects.toThrow('Email already exists')
  })
})
