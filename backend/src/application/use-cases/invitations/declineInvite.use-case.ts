import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

// tipo inferido do prisma (não precisa do type do client)
type InviteEntity = Awaited<ReturnType<typeof prisma.projectInvite.create>>

export type DeclineInviteInput = {
    token: string
}

export async function declineInvite({ token }: DeclineInviteInput): Promise<InviteEntity> {
    if (typeof token !== 'string' || token.trim() === '') {
        throw new AppError('Token inválido', 400)
    }

    const now = new Date()

    // 1) carrega o convite
    const invite = await prisma.projectInvite.findUnique({ where: { token } })
    if (!invite) {
        throw new AppError('Convite inválido', 404)
    }

    // 2) trata status/expiração
    if (invite.status !== 'PENDING') {
        if (invite.status === 'DECLINED') {
            // idempotente: já recusado → só retorna
            return invite as InviteEntity
        }
        if (invite.status === 'ACCEPTED') {
            throw new AppError('Convite já utilizado', 409)
        }
        // EXPIRED
        throw new AppError('Convite expirado', 410)
    }

    // Se está pendente mas já passou do prazo → expira e informa
    if (invite.expiresAt <= now) {
        await prisma.projectInvite.update({
            where: { id: invite.id },
            data: { status: 'EXPIRED' }
        })
        throw new AppError('Convite expirado', 410)
    }

    // 3) marca como DECLINED
    const declined = await prisma.projectInvite.update({
        where: { id: invite.id },
        data: { status: 'DECLINED', declinedAt: now }
    })

    return declined
}
