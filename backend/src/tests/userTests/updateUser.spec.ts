import 'dotenv/config'
import { prisma } from '../../infrastructure/prisma'
import { createUser } from '../../application/use-cases/user/createUser.use-case'
import { updateUser } from '../../application/use-cases/user/updateUser.use-case'
import bcrypt from 'bcrypt'

describe('Update User', () => {
  let userId: number

  beforeEach(async () => {
    await prisma.user.deleteMany()

    const user = await createUser({
      name: 'Original Name',
      email: `original_${Date.now()}@example.com`,
      password: 'originalPassword123'
    })

    userId = user.id
  })

  it('should update name and email', async () => {
    const updated = await updateUser(userId.toString(), {
      name: 'Updated Name',
      email: 'updated@example.com'
    })

    expect(updated.name).toBe('Updated Name')
    expect(updated.email).toBe('updated@example.com')
  })

  it('should update password and hash it', async () => {
    const updated = await updateUser(userId.toString(), {
      password: 'newPassword123'
    })

    const userInDb = await prisma.user.findUnique({ where: { id: userId } })
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
    const duplicatedEmail = `duplicate_${Date.now()}@example.com`

    await createUser({
      name: 'Other',
      email: duplicatedEmail,
      password: 'somepass123'
    })

    await expect(updateUser(userId.toString(), { email: duplicatedEmail }))
      .rejects.toThrow('Email already exists')
  })
})
