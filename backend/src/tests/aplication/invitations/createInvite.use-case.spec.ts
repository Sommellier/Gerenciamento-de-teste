// src/tests/aplication/invitations/createInvite.use-case.spec.ts
import 'dotenv/config'
import { beforeEach, afterAll, describe, expect, it, jest } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { createInvite } from '../../../application/use-cases/invitations/createInvite.use-case'
import type { Role } from '@prisma/client'
import * as emailService from '../../../application/use-cases/invitations/email.service'
import type { SpyInstance } from 'jest-mock'

let emailSpy: SpyInstance<typeof emailService.sendProjectInviteEmail>

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

beforeEach(async () => {
    // garante que nenhum spy antigo ficou pendurado
    jest.restoreAllMocks()
    jest.clearAllMocks()

    // limpa banco (ordem segura por FKs)
    await prisma.passwordResetToken.deleteMany()
    await prisma.evidence.deleteMany()
    await prisma.execution.deleteMany()
    await prisma.userOnProject.deleteMany()
    await prisma.projectInvite.deleteMany()
    await prisma.testCase.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()

    // cria um spy NOVO para este teste
    emailSpy = jest
        .spyOn(emailService, 'sendProjectInviteEmail')
        .mockImplementation(async () => { })

    process.env.APP_URL = process.env.APP_URL || 'http://localhost:3000'
})

// opcional, mas ajuda a manter o estado limpo se um teste quebrar antes do fim
afterEach(() => {
    jest.restoreAllMocks()
})

afterAll(async () => {
    await prisma.$disconnect()
})

async function seedBase() {
    const owner = await prisma.user.create({
        data: { name: 'Owner', email: unique('owner') + '@example.com', password: 'secret' }
    })
    const manager = await prisma.user.create({
        data: { name: 'Manager', email: unique('manager') + '@example.com', password: 'secret' }
    })
    const extra = await prisma.user.create({
        data: { name: 'Extra', email: unique('extra') + '@example.com', password: 'secret' }
    })

    const project = await prisma.project.create({
        data: { ownerId: owner.id, name: unique('Projeto'), description: null }
    })

    // membership do owner e do manager
    await prisma.userOnProject.create({ data: { projectId: project.id, userId: owner.id, role: 'OWNER' } })
    await prisma.userOnProject.create({ data: { projectId: project.id, userId: manager.id, role: 'MANAGER' } })

    return { owner, manager, extra, project }
}

describe('createInvite.use-case', () => {
    it('404 quando projeto não existe', async () => {
        await expect(
            createInvite({ projectId: 999_999, email: 'x@y.com', role: 'TESTER' as Role, invitedById: 1 })
        ).rejects.toMatchObject({ statusCode: 404 })
        expect(emailSpy).not.toHaveBeenCalled()
    })

    it('403 quando quem convida não é membro do projeto', async () => {
        const { project, extra } = await seedBase()
        await expect(
            createInvite({ projectId: project.id, email: 'x@y.com', role: 'TESTER' as Role, invitedById: extra.id })
        ).rejects.toMatchObject({ statusCode: 403 })
        expect(emailSpy).not.toHaveBeenCalled()
    })

    it('403 quando MANAGER tenta convidar OWNER/MANAGER', async () => {
        const { project, manager } = await seedBase()

        await expect(
            createInvite({ projectId: project.id, email: 'a@b.com', role: 'OWNER' as Role, invitedById: manager.id })
        ).rejects.toMatchObject({ statusCode: 403 })

        await expect(
            createInvite({ projectId: project.id, email: 'a@b.com', role: 'MANAGER' as Role, invitedById: manager.id })
        ).rejects.toMatchObject({ statusCode: 403 })

        expect(emailSpy).not.toHaveBeenCalled()
    })

    it('409 quando e-mail já é membro do projeto', async () => {
        const { owner, project } = await seedBase()
        const user = await prisma.user.create({
            data: { name: 'Member', email: unique('member') + '@example.com', password: 'secret' }
        })
        await prisma.userOnProject.create({
            data: { projectId: project.id, userId: user.id, role: 'TESTER' }
        })

        await expect(
            createInvite({ projectId: project.id, email: user.email, role: 'APPROVER' as Role, invitedById: owner.id })
        ).rejects.toMatchObject({ statusCode: 409 })

        expect(emailSpy).not.toHaveBeenCalled()
    })

    it('reenvia e retorna convite pendente existente quando resendIfPending=true', async () => {
        const { owner, project } = await seedBase()
        const targetEmail = unique('invite') + '@example.com'

        const existing = await prisma.projectInvite.create({
            data: {
                projectId: project.id,
                email: targetEmail,
                role: 'TESTER',
                token: 'tok-1',
                status: 'PENDING',
                invitedById: owner.id,
                expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            }
        })

        const res = await createInvite({
            projectId: project.id,
            email: targetEmail,
            role: 'TESTER' as Role,
            invitedById: owner.id,
            resendIfPending: true
        })

        // retornou o mesmo convite
        expect(res.id).toBe(existing.id)
        // não criou novo
        const count = await prisma.projectInvite.count({
            where: { projectId: project.id, email: targetEmail }
        })
        expect(count).toBe(1)

        // enviou e-mail
        expect(emailSpy).toHaveBeenCalledTimes(1)
    })

    it('409 quando já existe pendente e resendIfPending=false', async () => {
        const { owner, project } = await seedBase()
        const targetEmail = unique('pending') + '@example.com'

        await prisma.projectInvite.create({
            data: {
                projectId: project.id,
                email: targetEmail,
                role: 'TESTER',
                token: 'tok-2',
                status: 'PENDING',
                invitedById: owner.id,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
        })

        await expect(
            createInvite({
                projectId: project.id,
                email: targetEmail,
                role: 'TESTER' as Role,
                invitedById: owner.id,
                resendIfPending: false
            })
        ).rejects.toMatchObject({ statusCode: 409 })

        // não reenviou e-mail
        expect(emailSpy).not.toHaveBeenCalled()
    })

    it('sucesso: cria novo convite (usuário não existe) e envia e-mail; normaliza e-mail e TTL default (valor inválido)', async () => {
        const { owner, project } = await seedBase()
        process.env.INVITE_TTL_DAYS = '-5' // inválido → cai para 7

        const start = Date.now()
        const res = await createInvite({
            projectId: project.id,
            email: '  NewUser@Email.com ',
            role: 'APPROVER' as Role,
            invitedById: owner.id
        })

        expect(res.projectId).toBe(project.id)
        expect(res.email).toBe('newuser@email.com') // lower-case + trim
        expect(res.role).toBe('APPROVER')
        expect(res.status).toBe('PENDING')
        expect(res.token).toBeDefined()

        // TTL ≈ 7 dias (tolerância 10s)
        const diff = res.expiresAt.getTime() - start
        const sevenDays = 7 * 24 * 60 * 60 * 1000
        expect(diff).toBeGreaterThanOrEqual(sevenDays - 10_000)
        expect(diff).toBeLessThanOrEqual(sevenDays + 10_000)

        expect(emailSpy).toHaveBeenCalledTimes(1)
    })

    it('sucesso: TTL customizado (INVITE_TTL_DAYS=10)', async () => {
        const { owner, project } = await seedBase()
        process.env.INVITE_TTL_DAYS = '10'

        const start = Date.now()
        const res = await createInvite({
            projectId: project.id,
            email: unique('ttl10') + '@example.com',
            role: 'TESTER' as Role,
            invitedById: owner.id
        })

        const diff = res.expiresAt.getTime() - start
        const tenDays = 10 * 24 * 60 * 60 * 1000
        expect(diff).toBeGreaterThanOrEqual(tenDays - 10_000)
        expect(diff).toBeLessThanOrEqual(tenDays + 10_000)

        expect(emailSpy).toHaveBeenCalledTimes(1)
    })

    it('sucesso: usuário já existe mas AINDA não é membro → cria convite normalmente', async () => {
        const { owner, project } = await seedBase()
        const user = await prisma.user.create({
            data: { name: 'Candidate', email: unique('candidate') + '@example.com', password: 'secret' }
        })

        const res = await createInvite({
            projectId: project.id,
            email: user.email,
            role: 'TESTER' as Role,
            invitedById: owner.id
        })

        expect(res.email).toBe(user.email.toLowerCase())
        expect(res.status).toBe('PENDING')
        expect(emailSpy).toHaveBeenCalledTimes(1)

        // garante que não criou membership
        const mem = await prisma.userOnProject.findUnique({
            where: { userId_projectId: { userId: user.id, projectId: project.id } }
        })
        expect(mem).toBeNull()
    })
})

it('usa TTL default (7 dias) quando INVITE_TTL_DAYS está undefined', async () => {
    const { owner, project } = await seedBase()

    const prev = process.env.INVITE_TTL_DAYS
    delete process.env.INVITE_TTL_DAYS
    try {
        const start = Date.now()
        const res = await createInvite({
            projectId: project.id,
            email: unique('default') + '@example.com',
            role: 'TESTER' as Role,
            invitedById: owner.id
        })

        const diff = res.expiresAt.getTime() - start
        const sevenDays = 7 * 24 * 60 * 60 * 1000
        expect(diff).toBeGreaterThanOrEqual(sevenDays - 10_000)
        expect(diff).toBeLessThanOrEqual(sevenDays + 10_000)

        // e-mail disparado 1x neste teste
        expect(emailSpy).toHaveBeenCalledTimes(1)
    } finally {
        if (prev === undefined) {
            delete process.env.INVITE_TTL_DAYS
        } else {
            process.env.INVITE_TTL_DAYS = prev
        }
    }
})
