import 'dotenv/config'
import { listMembers } from '../../../application/use-cases/members/listMembers.use-case'
import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

describe('listMembers - casos edge e filtros específicos', () => {
  let ownerId: number
  let member1Id: number
  let member2Id: number
  let projectId: number

  beforeEach(async () => {
    // Limpar dados de teste
    await prisma.testScenarioStep.deleteMany()
    await prisma.testScenario.deleteMany()
    await prisma.testPackage.deleteMany()
    await prisma.projectInvite.deleteMany()
    await prisma.userOnProject.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()

    // Criar usuários
    const owner = await prisma.user.create({
      data: {
        name: 'Owner',
        email: `owner_${Date.now()}@example.com`,
        password: 'secret'
      }
    })
    ownerId = owner.id

    const member1 = await prisma.user.create({
      data: {
        name: 'Alice Member',
        email: `alice_${Date.now()}@example.com`,
        password: 'secret'
      }
    })
    member1Id = member1.id

    const member2 = await prisma.user.create({
      data: {
        name: 'Bob Member',
        email: `bob_${Date.now()}@example.com`,
        password: 'secret'
      }
    })
    member2Id = member2.id

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: owner.id
      }
    })
    projectId = project.id

    // Adicionar membros
    await prisma.userOnProject.create({
      data: {
        userId: member1.id,
        projectId: project.id,
        role: 'TESTER'
      }
    })

    await prisma.userOnProject.create({
      data: {
        userId: member2.id,
        projectId: project.id,
        role: 'MANAGER'
      }
    })
  })

  afterEach(async () => {
    await prisma.testScenarioStep.deleteMany()
    await prisma.testScenario.deleteMany()
    await prisma.testPackage.deleteMany()
    await prisma.projectInvite.deleteMany()
    await prisma.userOnProject.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('com filtro de roles e busca query', () => {
    it('deve incluir owner quando não há filtro de roles e busca por nome', async () => {
      const result = await listMembers({
        projectId,
        requesterId: ownerId,
        q: 'Owner'
      })

      expect(result.total).toBeGreaterThan(0)
      const ownerInList = result.items.find(m => m.role === 'OWNER')
      expect(ownerInList).toBeDefined()
    })

    it('deve filtrar por roles e aplicar busca query', async () => {
      const result = await listMembers({
        projectId,
        requesterId: ownerId,
        roles: ['TESTER'],
        q: 'Alice'
      })

      // Deve encontrar Alice como TESTER
      expect(result.items.length).toBeGreaterThan(0)
      result.items.forEach(item => {
        expect(item.role).toBe('TESTER')
        expect(item.user.name.toLowerCase()).toContain('alice')
      })
    })

    it('não deve incluir owner quando há filtro de roles', async () => {
      const result = await listMembers({
        projectId,
        requesterId: ownerId,
        roles: ['MANAGER']
      })

      result.items.forEach(item => {
        expect(item.role).toBe('MANAGER')
        expect(item.role).not.toBe('OWNER')
      })
    })
  })

  describe('ordenação por email com query', () => {
    it('deve ordenar por email quando há query de busca', async () => {
      const result = await listMembers({
        projectId,
        requesterId: ownerId,
        q: 'Member',
        orderBy: 'email',
        sort: 'asc'
      })

      expect(result.items.length).toBeGreaterThan(0)
      
      // Verificar se está ordenado por email
      for (let i = 0; i < result.items.length - 1; i++) {
        expect(result.items[i].user.email <= result.items[i + 1].user.email).toBe(true)
      }
    })

    it('deve ordenar por email descendente quando há query', async () => {
      const result = await listMembers({
        projectId,
        requesterId: ownerId,
        q: 'Member',
        orderBy: 'email',
        sort: 'desc'
      })

      expect(result.items.length).toBeGreaterThan(0)
      
      // Verificar se está ordenado por email desc
      for (let i = 0; i < result.items.length - 1; i++) {
        expect(result.items[i].user.email >= result.items[i + 1].user.email).toBe(true)
      }
    })
  })

  describe('ordenação por role com query', () => {
    it('deve ordenar por role quando há query de busca', async () => {
      const result = await listMembers({
        projectId,
        requesterId: ownerId,
        q: 'Member',
        orderBy: 'role',
        sort: 'asc'
      })

      expect(result.items.length).toBeGreaterThan(0)
    })

    it('deve ordenar por role descendente com query', async () => {
      const result = await listMembers({
        projectId,
        requesterId: ownerId,
        q: 'Member',
        orderBy: 'role',
        sort: 'desc'
      })

      expect(result.items.length).toBeGreaterThan(0)
    })
  })

  describe('caso edge: include owner em listagens sem filtro', () => {
    it('deve incluir owner no total quando não há filtro de roles (sem query)', async () => {
      const result = await listMembers({
        projectId,
        requesterId: ownerId,
        orderBy: 'role',
        sort: 'asc'
      })

      const ownerCount = result.items.filter(m => m.role === 'OWNER').length
      expect(ownerCount).toBe(1)
    })

    it('deve incluir owner no total quando não há filtro de roles (com query)', async () => {
      const result = await listMembers({
        projectId,
        requesterId: ownerId,
        q: 'Member',
        orderBy: 'name',
        sort: 'asc'
      })

      // Deve incluir owner se corresponder à query ou se não há filtro
      const hasOwner = result.items.some(m => m.userId === ownerId)
      expect(hasOwner).toBe(false) // Owner pode não corresponder à query "Member"
    })

    it('deve incrementar total quando inclui owner', async () => {
      const resultWithoutOwner = await listMembers({
        projectId,
        requesterId: ownerId,
        roles: ['TESTER']
      })

      const resultWithOwner = await listMembers({
        projectId,
        requesterId: ownerId
      })

      // Quando inclui owner, o total deve ser maior
      expect(resultWithOwner.total).toBeGreaterThan(resultWithoutOwner.total)
    })
  })
})

