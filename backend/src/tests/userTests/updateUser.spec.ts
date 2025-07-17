import 'dotenv/config'
import { prisma } from '../../infrastructure/prisma'
import { createUser } from '../../application/use-cases/user/createUser.use-case'
import { updateUser } from '../../application/use-cases/user/updateUser.use-case'
import bcrypt from 'bcrypt'

describe('Update User', () => {
  let originalUser: { id: number; email: string }

  beforeEach(async () => {
    await prisma.user.deleteMany()

    const created = await createUser({
      name: 'Original Name',
      email: `original_${Date.now()}@example.com`,
      password: 'originalPassword123'
    })

    originalUser = { id: created.id, email: created.email }
  })

  it('should update name and email', async () => {
    const updated = await updateUser(originalUser.id.toString(), {
      name: 'Updated Name',
      email: 'updated@example.com'
    })

    expect(updated.name).toBe('Updated Name')
    expect(updated.email).toBe('updated@example.com')
  })

  it('should update password and hash it', async () => {
    await updateUser(originalUser.id.toString(), {
      password: 'newPassword123'
    })

    const userInDb = await prisma.user.findUnique({ where: { id: originalUser.id } })
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
    const duplicateUser = await createUser({
      name: 'Other',
      email: `duplicate_${Date.now()}@example.com`,
      password: 'somepass123'
    })

    await expect(updateUser(originalUser.id.toString(), { email: duplicateUser.email }))
      .rejects.toThrow('Email already exists')
  })
})
