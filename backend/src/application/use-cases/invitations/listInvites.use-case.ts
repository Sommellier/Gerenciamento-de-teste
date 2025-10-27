import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import type { InviteStatus, Role } from '@prisma/client'

export type ListInvitesInput = {
    projectId: number
    requesterId: number
    status?: InviteStatus[]          // ex.: ['PENDING', 'ACCEPTED']
    q?: string                       // busca no e-mail (case-insensitive)
    page?: number                    // default 1
    pageSize?: number                // default 20 (máx 100)
    orderBy?: 'createdAt' | 'expiresAt' | 'status'
    sort?: 'asc' | 'desc'            // default 'desc'
}

type InviteRow = {
    id: number
    projectId: number
    email: string
    role: Role
    status: InviteStatus
    invitedById: number
    expiresAt: Date
    acceptedAt: Date | null
    declinedAt: Date | null
    createdAt: Date
    invitedBy: { id: number; name: string; email: string }
}

export type ListInvitesResult = {
    items: InviteRow[]
    total: number
    page: number
    pageSize: number
    hasNextPage: boolean
}

function normalizeEmailQuery(q?: string) {
    return q?.trim().toLowerCase() || undefined
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
}

export async function listInvites({
    projectId,
    requesterId,
    status,
    q,
    page = 1,
    pageSize = 20,
    orderBy = 'createdAt',
    sort = 'desc'
}: ListInvitesInput): Promise<ListInvitesResult> {
    if (!Number.isInteger(projectId) || projectId <= 0) {
        throw new AppError('projectId inválido', 400)
    }
    if (!Number.isInteger(requesterId) || requesterId <= 0) {
        throw new AppError('requesterId inválido', 400)
    }

    // 1) verifica se o projeto existe
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } })
    if (!project) throw new AppError('Projeto não encontrado', 404)

    // 2) autorização: apenas OWNER/MANAGER do projeto podem listar convites
    const membership = await prisma.userOnProject.findUnique({
        where: { userId_projectId: { userId: requesterId, projectId } },
        select: { role: true }
    })
    if (!membership) throw new AppError('Acesso negado ao projeto', 403)
    if (membership.role !== 'OWNER' && membership.role !== 'MANAGER') {
        throw new AppError('Somente OWNER/MANAGER podem listar convites', 403)
    }

    // 3) filtros
    const where: any = { projectId }
    if (status && status.length) where.status = { in: status }
    const emailQuery = normalizeEmailQuery(q)
    if (emailQuery) where.email = { contains: emailQuery }

    // paginação
    const safePage = Math.max(1, Math.floor(page))
    const safeSize = clamp(Math.floor(pageSize), 1, 100)
    const skip = (safePage - 1) * safeSize
    const take = safeSize

    // ordenação
    const order = ['createdAt', 'expiresAt', 'status'].includes(orderBy) ? orderBy : 'createdAt'
    const direction = sort === 'asc' ? 'asc' : 'desc'

    const [items, total] = await prisma.$transaction([
        prisma.projectInvite.findMany({
            where,
            skip,
            take,
            orderBy: { [order]: direction },
            // não expomos "token" aqui
            select: {
                id: true,
                projectId: true,
                email: true,
                role: true,
                status: true,
                invitedById: true,
                expiresAt: true,
                acceptedAt: true,
                declinedAt: true,
                createdAt: true,
                invitedBy: { select: { id: true, name: true, email: true } }
            }
        }),
        prisma.projectInvite.count({ where })
    ])

    return {
        items: items as InviteRow[],
        total,
        page: safePage,
        pageSize: safeSize,
        hasNextPage: skip + items.length < total
    }
}
