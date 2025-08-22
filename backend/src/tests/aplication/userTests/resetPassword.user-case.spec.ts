import { resetPassword } from '../../../application/use-cases/user/resetPassword.use-case';
import { prisma } from '../../../infrastructure/prisma'
import { hashPassword } from '../../../utils/hash.util'
import { AppError } from '../../../utils/AppError'

jest.mock('../../../../src/infrastructure/prisma', () => ({
    prisma: {
        passwordResetToken: {
            findUnique: jest.fn(),
            delete: jest.fn()
        },
        user: {
            update: jest.fn()
        }
    }
}))

jest.mock('../../../../src/utils/hash.util', () => ({
    hashPassword: jest.fn().mockResolvedValue('hashedPassword')
}))

const mockToken = {
    token: 'valid-token',
    userId: 1,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60) // 1h no futuro
}

describe('resetPassword', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('deve lançar erro se o token for inválido', async () => {
        (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(null)

        await expect(resetPassword('invalid-token', 'newPass123')).rejects.toThrow('Token inválido ou expirado')
    })

    it('deve lançar erro se o token estiver expirado', async () => {
        const expiredToken = { ...mockToken, expiresAt: new Date(Date.now() - 1000) } as typeof mockToken
        (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(expiredToken)

        await expect(resetPassword('expired-token', 'newPass123')).rejects.toThrow('Token inválido ou expirado')
    })

    it('deve redefinir a senha com sucesso', async () => {
        (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(mockToken)

        await resetPassword('valid-token', 'newPass123')

        expect(hashPassword).toHaveBeenCalledWith('newPass123')
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: mockToken.userId },
            data: { password: 'hashedPassword' }
        })
        expect(prisma.passwordResetToken.delete).toHaveBeenCalledWith({
            where: { token: 'valid-token' }
        })
    })

    it('deve lançar erro se a nova senha não for fornecida', async () => {
        await expect(resetPassword('valid-token', '')).rejects.toThrow('Token e nova senha são obrigatórios')
    })

    it('deve lançar erro se o token não for fornecido', async () => {
        await expect(resetPassword('', 'newPass123')).rejects.toThrow('Token e nova senha são obrigatórios')
    })
})
