import request from 'supertest'
import { Express } from 'express'
import { AppError } from '../../../utils/AppError'
import { createInvite } from '../../../application/use-cases/invitations/createInvite.use-case'
import { prisma } from '../../../infrastructure/prisma'
import jwt from 'jsonwebtoken'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

// Mock do envio de email
jest.mock('../../../application/use-cases/invitations/email.service', () => ({
  sendProjectInviteEmail: jest.fn().mockResolvedValue(undefined)
}))

// Mock do email.util também
jest.mock('../../../utils/email.util', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined)
}))

// Mock do rate limiter
jest.mock('../../../infrastructure/rateLimiter', () => ({
  publicLimiter: (_req: any, _res: any, next: any) => next(),
  loginLimiter: (_req: any, _res: any, next: any) => next(),
  registerLimiter: (_req: any, _res: any, next: any) => next(),
  uploadLimiter: (_req: any, _res: any, next: any) => next(),
  inviteLimiter: (_req: any, _res: any, next: any) => next(),
}))

// Importar o servidor uma vez para evitar problemas de cache
let appInstance: Express | null = null

function makeApp(setUser?: (req: any, _res: any, next: any) => void) {
  // Criar instância apenas uma vez
  if (!appInstance) {
    appInstance = require('../../../server').default as Express
  }
  // Não aplicar setUser no app compartilhado - usar autenticação real
  return appInstance
}

function createToken(userId: number) {
  const secret = process.env.JWT_SECRET || 'test-secret'
  return jwt.sign({ userId, type: 'access' }, secret, { expiresIn: '1h' })
}

describe('Multiple Invites Test', () => {
  jest.setTimeout(30000) // 30 segundos para todos os testes

  beforeEach(async () => {
    await prisma.$transaction([
      prisma.projectInvite.deleteMany(),
      prisma.userOnProject.deleteMany(),
      prisma.project.deleteMany(),
      prisma.user.deleteMany()
    ])
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('deve criar múltiplos convites para diferentes usuários com roles diferentes', async () => {
    jest.setTimeout(15000)
    // Criar usuário OWNER
    const owner = await prisma.user.create({
      data: {
        name: 'Owner',
        email: unique('owner') + '@example.com',
        password: 'secret'
      }
    })

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: owner.id
      }
    })

    // Adicionar OWNER como membro do projeto
    await prisma.userOnProject.create({
      data: {
        userId: owner.id,
        projectId: project.id,
        role: 'OWNER'
      }
    })

    const app = makeApp()
    const token = createToken(owner.id)

    // Criar convites para múltiplos usuários com roles diferentes
    const invites = [
      { email: 'tester1@example.com', role: 'TESTER' },
      { email: 'tester2@example.com', role: 'TESTER' },
      { email: 'manager1@example.com', role: 'MANAGER' },
      { email: 'approver1@example.com', role: 'APPROVER' },
      { email: 'approver2@example.com', role: 'APPROVER' }
    ]

    // Criar convites sequencialmente para evitar problemas de concorrência
    const responses = []
    for (const invite of invites) {
      const response = await request(app)
        .post(`/api/projects/${project.id}/invites`)
        .set('Authorization', `Bearer ${token}`)
        .send(invite)
      
      // Log para debug se houver erro
      if (response.status !== 201) {
        console.error('Erro ao criar convite:', {
          email: invite.email,
          role: invite.role,
          status: response.status,
          body: response.body
        })
      }
      
      responses.push(response)
    }

    // Verificar se todos os convites foram criados com sucesso
    for (let i = 0; i < responses.length; i++) {
      expect(responses[i].status).toBe(201)
      // Email é normalizado para lowercase no backend
      expect(responses[i].body.email.toLowerCase()).toBe(invites[i].email.toLowerCase())
      expect(responses[i].body.role).toBe(invites[i].role)
      expect(responses[i].body.status).toBe('PENDING')
    }

    // Verificar se todos os convites estão no banco de dados
    const dbInvites = await prisma.projectInvite.findMany({
      where: { projectId: project.id }
    })

    expect(dbInvites).toHaveLength(5)
    
    // Verificar se cada convite tem o email e role corretos (email normalizado)
    for (const invite of invites) {
      const normalizedEmail = invite.email.toLowerCase().trim()
      const dbInvite = dbInvites.find(i => i.email === normalizedEmail)
      expect(dbInvite).toBeTruthy()
      expect(dbInvite?.role).toBe(invite.role)
      expect(dbInvite?.status).toBe('PENDING')
    }
  })

  it('deve criar convites para usuários com roles diferentes de TESTER', async () => {
    // Criar usuário OWNER
    const owner = await prisma.user.create({
      data: {
        name: 'Owner',
        email: unique('owner') + '@example.com',
        password: 'secret'
      }
    })

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: owner.id
      }
    })

    // Adicionar OWNER como membro do projeto
    await prisma.userOnProject.create({
      data: {
        userId: owner.id,
        projectId: project.id,
        role: 'OWNER'
      }
    })

    const app = makeApp()
    const token = createToken(owner.id)

    // Testar cada role diferente de TESTER
    const nonTesterRoles = ['MANAGER', 'APPROVER']
    
    for (const role of nonTesterRoles) {
      const response = await request(app)
        .post(`/api/projects/${project.id}/invites`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: `${role.toLowerCase()}@example.com`,
          role: role
        })

      expect(response.status).toBe(201)
      expect(response.body.role).toBe(role)
      expect(response.body.status).toBe('PENDING')
    }

    // Verificar se os convites estão no banco
    const dbInvites = await prisma.projectInvite.findMany({
      where: { projectId: project.id }
    })

    expect(dbInvites).toHaveLength(2)
    expect(dbInvites.some(i => i.role === 'MANAGER')).toBe(true)
    expect(dbInvites.some(i => i.role === 'APPROVER')).toBe(true)
  })

  it('deve falhar quando MANAGER tenta convidar para OWNER/MANAGER', async () => {
    // Criar usuário OWNER
    const owner = await prisma.user.create({
      data: {
        name: 'Owner',
        email: unique('owner') + '@example.com',
        password: 'secret'
      }
    })

    // Criar usuário MANAGER
    const manager = await prisma.user.create({
      data: {
        name: 'Manager',
        email: unique('manager') + '@example.com',
        password: 'secret'
      }
    })

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: owner.id
      }
    })

    // Adicionar MANAGER como membro do projeto
    await prisma.userOnProject.create({
      data: {
        userId: manager.id,
        projectId: project.id,
        role: 'MANAGER'
      }
    })

    const app = makeApp()
    const token = createToken(manager.id)

    // Tentar convidar para OWNER (deve falhar)
    const ownerResponse = await request(app)
      .post(`/api/projects/${project.id}/invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'newowner@example.com',
        role: 'OWNER'
      })

    expect(ownerResponse.status).toBe(403)
    expect(ownerResponse.body.message).toContain('MANAGER não pode convidar para OWNER/MANAGER')

    // Tentar convidar para MANAGER (deve falhar)
    const managerResponse = await request(app)
      .post(`/api/projects/${project.id}/invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'newmanager@example.com',
        role: 'MANAGER'
      })

    expect(managerResponse.status).toBe(403)
    expect(managerResponse.body.message).toContain('MANAGER não pode convidar para OWNER/MANAGER')

    // Tentar convidar para TESTER (deve funcionar)
    const testerResponse = await request(app)
      .post(`/api/projects/${project.id}/invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'tester@example.com',
        role: 'TESTER'
      })

    expect(testerResponse.status).toBe(201)
    expect(testerResponse.body.role).toBe('TESTER')

    // Tentar convidar para APPROVER (deve funcionar)
    const approverResponse = await request(app)
      .post(`/api/projects/${project.id}/invites`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'approver@example.com',
        role: 'APPROVER'
      })

    expect(approverResponse.status).toBe(201)
    expect(approverResponse.body.role).toBe('APPROVER')
  })
})
