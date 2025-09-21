import { prisma } from '../../../infrastructure/prisma'
import { getProjectDetails } from '../../../application/use-cases/projetos/getProjectDetails.use-case'
import { AppError } from '../../../utils/AppError'

// Mock das dependências
jest.mock('../../../application/use-cases/scenarios/getProjectMetrics.use-case')
jest.mock('../../../application/use-cases/scenarios/getProjectReleases.use-case')

import { getProjectMetrics } from '../../../application/use-cases/scenarios/getProjectMetrics.use-case'
import { getProjectReleases } from '../../../application/use-cases/scenarios/getProjectReleases.use-case'

const mockGetProjectMetrics = getProjectMetrics as jest.MockedFunction<typeof getProjectMetrics>
const mockGetProjectReleases = getProjectReleases as jest.MockedFunction<typeof getProjectReleases>

describe('getProjectDetails', () => {
  let projectId: number
  let ownerId: number
  let memberId: number

  beforeEach(async () => {
    // Limpar mocks
    jest.clearAllMocks()

    // Criar usuário dono do projeto
    const owner = await prisma.user.create({
      data: {
        name: 'Project Owner',
        email: 'owner@example.com',
        password: 'password123'
      }
    })
    ownerId = owner.id

    // Criar usuário membro
    const member = await prisma.user.create({
      data: {
        name: 'Project Member',
        email: 'member@example.com',
        password: 'password123'
      }
    })
    memberId = member.id

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId
      }
    })
    projectId = project.id

    // Adicionar membro ao projeto
    await prisma.userOnProject.create({
      data: {
        userId: memberId,
        projectId,
        role: 'TESTER'
      }
    })

    // Mock das funções dependentes
    mockGetProjectMetrics.mockResolvedValue({
      created: 5,
      executed: 3,
      passed: 2,
      failed: 1
    })

    mockGetProjectReleases.mockResolvedValue(['v1.0', 'v1.1', 'v2.0'])
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.userOnProject.deleteMany({
      where: {
        projectId
      }
    })
    await prisma.testPackage.deleteMany({
      where: {
        projectId
      }
    })
    await prisma.project.deleteMany({
      where: {
        id: projectId
      }
    })
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['owner@example.com', 'member@example.com']
        }
      }
    })
  })

  describe('getProjectDetails - casos de sucesso', () => {
    it('retorna detalhes do projeto sem release', async () => {
      const result = await getProjectDetails({ projectId })

      expect(result).toMatchObject({
        id: projectId,
        name: 'Test Project',
        description: 'Test Description',
        ownerId,
        members: expect.arrayContaining([
          expect.objectContaining({
            id: ownerId,
            name: 'Project Owner',
            email: 'owner@example.com',
            role: 'OWNER'
          }),
          expect.objectContaining({
            id: memberId,
            name: 'Project Member',
            email: 'member@example.com',
            role: 'TESTER'
          })
        ]),
        metrics: {
          created: 5,
          executed: 3,
          passed: 2,
          failed: 1
        },
        availableReleases: ['v1.0', 'v1.1', 'v2.0'],
        testPackages: expect.any(Array)
      })

      expect(mockGetProjectMetrics).toHaveBeenCalledWith({ projectId, release: undefined })
      expect(mockGetProjectReleases).toHaveBeenCalledWith({ projectId })
    })

    it('retorna detalhes do projeto com release específica', async () => {
      const release = 'v1.0'
      const result = await getProjectDetails({ projectId, release })

      expect(result).toMatchObject({
        id: projectId,
        name: 'Test Project',
        description: 'Test Description',
        ownerId
      })

      expect(mockGetProjectMetrics).toHaveBeenCalledWith({ projectId, release })
      expect(mockGetProjectReleases).toHaveBeenCalledWith({ projectId })
    })

    it('retorna detalhes do projeto com pacotes de teste', async () => {
      // Criar pacotes de teste
      const testPackage1 = await prisma.testPackage.create({
        data: {
          title: 'Test Package 1',
          description: 'Description 1',
          projectId,
          release: 'v1.0',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const testPackage2 = await prisma.testPackage.create({
        data: {
          title: 'Test Package 2',
          description: 'Description 2',
          projectId,
          release: 'v1.1',
          status: 'PASSED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectDetails({ projectId })

      expect(result.testPackages).toHaveLength(2)
      expect(result.testPackages[0]).toMatchObject({
        id: testPackage2.id,
        title: 'Test Package 2',
        description: 'Description 2',
        projectId,
        release: 'v1.1',
        status: 'PASSED'
      })
      expect(result.testPackages[1]).toMatchObject({
        id: testPackage1.id,
        title: 'Test Package 1',
        description: 'Description 1',
        projectId,
        release: 'v1.0',
        status: 'CREATED'
      })
    })

    it('retorna detalhes do projeto com pacotes de teste filtrados por release', async () => {
      // Criar pacotes de teste
      await prisma.testPackage.create({
        data: {
          title: 'Test Package 1',
          description: 'Description 1',
          projectId,
          release: 'v1.0',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      await prisma.testPackage.create({
        data: {
          title: 'Test Package 2',
          description: 'Description 2',
          projectId,
          release: 'v1.1',
          status: 'PASSED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectDetails({ projectId, release: 'v1.0' })

      expect(result.testPackages).toHaveLength(1)
      expect(result.testPackages[0]).toMatchObject({
        title: 'Test Package 1',
        release: 'v1.0'
      })
    })

    it('retorna detalhes do projeto com owner já nos membros', async () => {
      // Adicionar owner como membro também
      await prisma.userOnProject.create({
        data: {
          userId: ownerId,
          projectId,
          role: 'ADMIN'
        }
      })

      const result = await getProjectDetails({ projectId })

      // Verificar que o owner aparece apenas uma vez
      const ownerMembers = result.members.filter(m => m.id === ownerId)
      expect(ownerMembers).toHaveLength(1)
      expect(ownerMembers[0]).toMatchObject({
        id: ownerId,
        name: 'Project Owner',
        email: 'owner@example.com',
        role: 'ADMIN' // Deve manter o role do membro, não 'OWNER'
      })
    })

    it('retorna detalhes do projeto sem membros adicionais', async () => {
      // Remover membro adicional
      await prisma.userOnProject.deleteMany({
        where: { projectId }
      })

      const result = await getProjectDetails({ projectId })

      expect(result.members).toHaveLength(1)
      expect(result.members[0]).toMatchObject({
        id: ownerId,
        name: 'Project Owner',
        email: 'owner@example.com',
        role: 'OWNER'
      })
    })

    it('retorna detalhes do projeto com owner nos membros mas adiciona como OWNER', async () => {
      // Adicionar owner como membro
      await prisma.userOnProject.create({
        data: {
          userId: ownerId,
          projectId,
          role: 'ADMIN'
        }
      })

      const result = await getProjectDetails({ projectId })

      // Verificar que o owner aparece apenas uma vez
      const ownerMembers = result.members.filter(m => m.id === ownerId)
      expect(ownerMembers).toHaveLength(1)
      expect(ownerMembers[0]).toMatchObject({
        id: ownerId,
        name: 'Project Owner',
        email: 'owner@example.com',
        role: 'ADMIN' // Deve manter o role do membro
      })
    })
  })

  describe('getProjectDetails - casos de erro', () => {
    it('rejeita quando projeto não existe', async () => {
      const nonExistentProjectId = 999999

      await expect(getProjectDetails({ projectId: nonExistentProjectId })).rejects.toMatchObject({
        status: 404,
        message: 'Projeto não encontrado'
      })
    })

    it('rejeita quando projectId é inválido', async () => {
      await expect(getProjectDetails({ projectId: 0 })).rejects.toMatchObject({
        status: 404,
        message: 'Projeto não encontrado'
      })
    })

    it('rejeita quando projectId é negativo', async () => {
      await expect(getProjectDetails({ projectId: -1 })).rejects.toMatchObject({
        status: 404,
        message: 'Projeto não encontrado'
      })
    })

    it('rejeita quando projectId é undefined', async () => {
      await expect(getProjectDetails({ projectId: undefined as any })).rejects.toThrow()
    })

    it('rejeita quando projectId é null', async () => {
      await expect(getProjectDetails({ projectId: null as any })).rejects.toThrow()
    })
  })

  describe('getProjectDetails - validação de entrada', () => {
    it('aceita release como string vazia', async () => {
      const result = await getProjectDetails({ projectId, release: '' })

      expect(result).toBeDefined()
      expect(result.id).toBe(projectId)
    })

    it('aceita release como undefined', async () => {
      const result = await getProjectDetails({ projectId, release: undefined })

      expect(result).toBeDefined()
      expect(result.id).toBe(projectId)
    })

    it('aceita release como null', async () => {
      const result = await getProjectDetails({ projectId, release: null as any })

      expect(result).toBeDefined()
      expect(result.id).toBe(projectId)
    })
  })

  describe('getProjectDetails - casos especiais', () => {
    it('funciona com projeto que tem muitos pacotes de teste', async () => {
      // Criar muitos pacotes de teste com delays para garantir ordenação por createdAt
      const testPackages = []
      for (let i = 0; i < 15; i++) {
        // Adicionar delay pequeno para garantir ordenação por createdAt
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
        
        const testPackage = await prisma.testPackage.create({
          data: {
            title: `Test Package ${i}`,
            description: `Description ${i}`,
            projectId,
            release: `v1.${i}`,
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        })
        testPackages.push(testPackage)
      }

      const result = await getProjectDetails({ projectId })

      // Deve retornar apenas 10 (take: 10)
      expect(result.testPackages).toHaveLength(10)
      // Deve estar ordenado por createdAt desc (mais recente primeiro)
      expect(result.testPackages[0].title).toBe('Test Package 14')
      // O último item deve ser um dos primeiros criados (índices 0-5)
      const lastItemTitle = result.testPackages[9].title
      expect(lastItemTitle).toMatch(/^Test Package [0-5]$/)
    })

    it('funciona com projeto que tem pacotes de teste com steps', async () => {
      // Criar pacote de teste com steps
      const testPackage = await prisma.testPackage.create({
        data: {
          title: 'Test Package with Steps',
          description: 'Description',
          projectId,
          release: 'v1.0',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      // Criar steps para o pacote
      await prisma.testPackageStep.create({
        data: {
          packageId: testPackage.id,
          stepOrder: 2,
          action: 'Action 2',
          expected: 'Expected 2'
        }
      })

      await prisma.testPackageStep.create({
        data: {
          packageId: testPackage.id,
          stepOrder: 1,
          action: 'Action 1',
          expected: 'Expected 1'
        }
      })

      const result = await getProjectDetails({ projectId })

      expect(result.testPackages).toHaveLength(1)
      expect(result.testPackages[0].steps).toHaveLength(2)
      // Steps devem estar ordenados por stepOrder asc
      expect(result.testPackages[0].steps[0].stepOrder).toBe(1)
      expect(result.testPackages[0].steps[1].stepOrder).toBe(2)
    })

    it('funciona com projeto que tem owner com avatar', async () => {
      // Atualizar owner com avatar
      await prisma.user.update({
        where: { id: ownerId },
        data: { avatar: 'avatar-url.jpg' }
      })

      const result = await getProjectDetails({ projectId })

      expect(result.members[0]).toMatchObject({
        id: ownerId,
        name: 'Project Owner',
        email: 'owner@example.com',
        avatar: 'avatar-url.jpg',
        role: 'OWNER'
      })
    })

    it('funciona com projeto que tem membros com avatares', async () => {
      // Atualizar membro com avatar
      await prisma.user.update({
        where: { id: memberId },
        data: { avatar: 'member-avatar.jpg' }
      })

      const result = await getProjectDetails({ projectId })

      const member = result.members.find(m => m.id === memberId)
      expect(member).toMatchObject({
        id: memberId,
        name: 'Project Member',
        email: 'member@example.com',
        avatar: 'member-avatar.jpg',
        role: 'TESTER'
      })
    })
  })

  describe('getProjectDetails - tratamento de erros das dependências', () => {
    it('propaga erro do getProjectMetrics', async () => {
      mockGetProjectMetrics.mockRejectedValue(new AppError('Erro nas métricas', 500))

      await expect(getProjectDetails({ projectId })).rejects.toMatchObject({
        status: 500,
        message: 'Erro nas métricas'
      })
    })

    it('propaga erro do getProjectReleases', async () => {
      mockGetProjectReleases.mockRejectedValue(new AppError('Erro nas releases', 500))

      await expect(getProjectDetails({ projectId })).rejects.toMatchObject({
        status: 500,
        message: 'Erro nas releases'
      })
    })
  })

  describe('getProjectDetails - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const result = await getProjectDetails({ projectId })

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('description')
      expect(result).toHaveProperty('ownerId')
      expect(result).toHaveProperty('createdAt')
      expect(result).toHaveProperty('updatedAt')
      expect(result).toHaveProperty('members')
      expect(result).toHaveProperty('metrics')
      expect(result).toHaveProperty('availableReleases')
      expect(result).toHaveProperty('testPackages')
    })

    it('retorna tipos corretos para propriedades', async () => {
      const result = await getProjectDetails({ projectId })

      expect(typeof result.id).toBe('number')
      expect(typeof result.name).toBe('string')
      expect(typeof result.description).toBe('string')
      expect(typeof result.ownerId).toBe('number')
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
      expect(Array.isArray(result.members)).toBe(true)
      expect(typeof result.metrics).toBe('object')
      expect(Array.isArray(result.availableReleases)).toBe(true)
      expect(Array.isArray(result.testPackages)).toBe(true)
    })

    it('retorna membros com estrutura correta', async () => {
      const result = await getProjectDetails({ projectId })

      expect(result.members).toHaveLength(2)
      
      result.members.forEach(member => {
        expect(member).toHaveProperty('id')
        expect(member).toHaveProperty('name')
        expect(member).toHaveProperty('email')
        expect(member).toHaveProperty('avatar')
        expect(member).toHaveProperty('role')
        
        expect(typeof member.id).toBe('number')
        expect(typeof member.name).toBe('string')
        expect(typeof member.email).toBe('string')
        expect(typeof member.role).toBe('string')
      })
    })
  })

  describe('getProjectDetails - casos de edge', () => {
    it('funciona com projeto que tem nome longo', async () => {
      const longName = 'A'.repeat(255)
      await prisma.project.update({
        where: { id: projectId },
        data: { name: longName }
      })

      const result = await getProjectDetails({ projectId })

      expect(result.name).toBe(longName)
    })

    it('funciona com projeto que tem descrição longa', async () => {
      const longDescription = 'A'.repeat(1000)
      await prisma.project.update({
        where: { id: projectId },
        data: { description: longDescription }
      })

      const result = await getProjectDetails({ projectId })

      expect(result.description).toBe(longDescription)
    })

    it('funciona com projeto que tem muitos membros', async () => {
      // Criar muitos membros
      const members = []
      for (let i = 0; i < 10; i++) {
        const user = await prisma.user.create({
          data: {
            name: `Member ${i}`,
            email: `member${i}@example.com`,
            password: 'password123'
          }
        })
        members.push(user)

        await prisma.userOnProject.create({
          data: {
            userId: user.id,
            projectId,
            role: 'TESTER'
          }
        })
      }

      const result = await getProjectDetails({ projectId })

      // Deve ter owner + 10 membros + 1 membro original = 12 total
      expect(result.members).toHaveLength(12)

      // Limpar membros adicionais
      await prisma.userOnProject.deleteMany({
        where: {
          userId: { in: members.map(m => m.id) }
        }
      })
      await prisma.user.deleteMany({
        where: {
          id: { in: members.map(m => m.id) }
        }
      })
    })
  })
})
