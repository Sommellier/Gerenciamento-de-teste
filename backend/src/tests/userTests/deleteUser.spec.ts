import 'dotenv/config'
import { createUser } from '../../application/use-cases/user/createUser.use-case'
import { deleteUser } from '../../application/use-cases/user/deleteUser.use-case'
import { prisma } from '../../infrastructure/prisma'
import { describe, it, beforeEach, expect } from '@jest/globals'

describe('Delete User', () => {
    let userId: number

    beforeEach(async () => {
        await prisma.user.deleteMany()

        const newUser = await createUser({
            name: 'User to Delete',
            email: `delete_${Date.now()}@example.com`,
            password: 'securepassword'
        })

        userId = newUser.id
    })

    it('should delete a user successfully', async () => {
        const deleted = await deleteUser(userId.toString())

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
        await deleteUser(userId.toString())

        await expect(deleteUser(userId.toString())).rejects.toThrow('User not found')
    })

})
