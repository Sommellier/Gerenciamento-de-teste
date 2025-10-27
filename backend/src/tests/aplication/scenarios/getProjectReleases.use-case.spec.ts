import { prisma } from '../../../infrastructure/prisma'
import { getProjectReleases } from '../../../application/use-cases/scenarios/getProjectReleases.use-case'
import { AppError } from '../../../utils/AppError'

describe('getProjectReleases', () => {
  let projectId: number
  let ownerId: number

  beforeEach(async () => {
    // Criar usuário dono do projeto
    const owner = await prisma.user.create({
      data: {
        name: 'Project Owner',
        email: 'owner@example.com',
        password: 'password123'
      }
    })
    ownerId = owner.id

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId
      }
    })
    projectId = project.id
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.testPackage.deleteMany({
      where: { projectId }
    })
    await prisma.project.deleteMany({
      where: { id: projectId }
    })
    await prisma.user.deleteMany({
      where: {
        email: 'owner@example.com'
      }
    })
  })

  describe('getProjectReleases - casos de sucesso', () => {
    it('retorna array vazio quando não há pacotes', async () => {
      const result = await getProjectReleases({ projectId })

      expect(result).toEqual([])
    })

    it('retorna releases únicas ordenadas por data decrescente', async () => {
      // Criar pacotes com diferentes releases
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Package 1',
            description: 'Description 1',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 2',
            description: 'Description 2',
            projectId,
            release: '2024-03',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 3',
            description: 'Description 3',
            projectId,
            release: '2024-02',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 4',
            description: 'Description 4',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toEqual(['2024-03', '2024-02', '2024-01'])
    })

    it('retorna releases únicas mesmo com pacotes duplicados', async () => {
      // Criar pacotes com releases duplicadas
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Package 1',
            description: 'Description 1',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 2',
            description: 'Description 2',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 3',
            description: 'Description 3',
            projectId,
            release: '2024-01',
            status: 'FAILED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 4',
            description: 'Description 4',
            projectId,
            release: '2024-02',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toEqual(['2024-02', '2024-01'])
      expect(result).toHaveLength(2)
    })

    it('retorna releases com diferentes tipos de pacotes', async () => {
      // Criar pacotes de diferentes tipos
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Functional Package',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Regression Package',
            description: 'Description',
            projectId,
            release: '2024-02',
            status: 'PASSED',
            type: 'REGRESSION',
            priority: 'HIGH'
          },
          {
            title: 'Smoke Package',
            description: 'Description',
            projectId,
            release: '2024-03',
            status: 'EXECUTED',
            type: 'SMOKE',
            priority: 'LOW'
          },
          {
            title: 'E2E Package',
            description: 'Description',
            projectId,
            release: '2024-04',
            status: 'FAILED',
            type: 'E2E',
            priority: 'CRITICAL'
          }
        ]
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toEqual(['2024-04', '2024-03', '2024-02', '2024-01'])
    })

    it('retorna releases com diferentes prioridades', async () => {
      // Criar pacotes de diferentes prioridades
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Low Priority Package',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'LOW'
          },
          {
            title: 'Medium Priority Package',
            description: 'Description',
            projectId,
            release: '2024-02',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'High Priority Package',
            description: 'Description',
            projectId,
            release: '2024-03',
            status: 'EXECUTED',
            type: 'FUNCTIONAL',
            priority: 'HIGH'
          },
          {
            title: 'Critical Priority Package',
            description: 'Description',
            projectId,
            release: '2024-04',
            status: 'FAILED',
            type: 'FUNCTIONAL',
            priority: 'CRITICAL'
          }
        ]
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toEqual(['2024-04', '2024-03', '2024-02', '2024-01'])
    })

    it('retorna releases com diferentes ambientes', async () => {
      // Criar pacotes de diferentes ambientes
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'DEV Package',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            environment: 'DEV'
          },
          {
            title: 'QA Package',
            description: 'Description',
            projectId,
            release: '2024-02',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            environment: 'QA'
          },
          {
            title: 'STAGING Package',
            description: 'Description',
            projectId,
            release: '2024-03',
            status: 'EXECUTED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            environment: 'STAGING'
          },
          {
            title: 'PROD Package',
            description: 'Description',
            projectId,
            release: '2024-04',
            status: 'FAILED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            environment: 'PROD'
          }
        ]
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toEqual(['2024-04', '2024-03', '2024-02', '2024-01'])
    })

    it('retorna releases com assigneeEmail', async () => {
      // Criar pacotes com assigneeEmail
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Package 1',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            assigneeEmail: 'assignee1@example.com'
          },
          {
            title: 'Package 2',
            description: 'Description',
            projectId,
            release: '2024-02',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            assigneeEmail: 'assignee2@example.com'
          }
        ]
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toEqual(['2024-02', '2024-01'])
    })

    it('retorna releases com tags', async () => {
      // Criar pacotes com tags
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Package 1',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            tags: JSON.stringify(['tag1', 'tag2'])
          },
          {
            title: 'Package 2',
            description: 'Description',
            projectId,
            release: '2024-02',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM',
            tags: JSON.stringify(['tag3', 'tag4'])
          }
        ]
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toEqual(['2024-02', '2024-01'])
    })

    it('retorna releases ordenadas corretamente por data', async () => {
      // Criar pacotes com releases em ordem aleatória
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Package 1',
            description: 'Description',
            projectId,
            release: '2023-12',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 2',
            description: 'Description',
            projectId,
            release: '2024-06',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 3',
            description: 'Description',
            projectId,
            release: '2024-03',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 4',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 5',
            description: 'Description',
            projectId,
            release: '2024-09',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toEqual(['2024-09', '2024-06', '2024-03', '2024-01', '2023-12'])
    })
  })

  describe('getProjectReleases - casos de erro', () => {
    it('rejeita quando projeto não existe', async () => {
      const nonExistentProjectId = 999999

      await expect(getProjectReleases({ projectId: nonExistentProjectId })).rejects.toMatchObject({
        status: 404,
        message: 'Projeto não encontrado'
      })
    })

    it('rejeita quando projectId é inválido', async () => {
      await expect(getProjectReleases({ projectId: 0 })).rejects.toMatchObject({
        status: 404,
        message: 'Projeto não encontrado'
      })
    })

    it('rejeita quando projectId é negativo', async () => {
      await expect(getProjectReleases({ projectId: -1 })).rejects.toMatchObject({
        status: 404,
        message: 'Projeto não encontrado'
      })
    })

    it('rejeita quando projectId é undefined', async () => {
      await expect(getProjectReleases({ projectId: undefined as any })).rejects.toThrow()
    })

    it('rejeita quando projectId é null', async () => {
      await expect(getProjectReleases({ projectId: null as any })).rejects.toThrow()
    })
  })

  describe('getProjectReleases - casos especiais', () => {
    it('funciona com projeto que tem muitos pacotes', async () => {
      // Criar muitos pacotes com diferentes releases
      const packages = []
      for (let i = 0; i < 100; i++) {
        const release = `2024-${String(i % 12 + 1).padStart(2, '0')}`
        packages.push({
          title: `Package ${i}`,
          description: `Description ${i}`,
          projectId,
          release,
          status: 'CREATED' as const,
          type: 'FUNCTIONAL' as const,
          priority: 'MEDIUM' as const
        })
      }

      await prisma.testPackage.createMany({
        data: packages
      })

      const result = await getProjectReleases({ projectId })

      // Deve ter 12 releases únicas (2024-01 a 2024-12)
      expect(result).toHaveLength(12)
      expect(result[0]).toBe('2024-12') // Mais recente
      expect(result[11]).toBe('2024-01') // Mais antiga
    })

    it('funciona com projeto que tem pacotes com títulos longos', async () => {
      const longTitle = 'A'.repeat(255)
      await prisma.testPackage.create({
        data: {
          title: longTitle,
          description: 'Description',
          projectId,
          release: '2024-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toEqual(['2024-01'])
    })

    it('funciona com projeto que tem pacotes com descrições longas', async () => {
      const longDescription = 'A'.repeat(1000)
      await prisma.testPackage.create({
        data: {
          title: 'Package',
          description: longDescription,
          projectId,
          release: '2024-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toEqual(['2024-01'])
    })

    it('funciona com projeto que tem pacotes com releases em diferentes formatos', async () => {
      // Criar pacotes com releases em diferentes formatos
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Package 1',
            description: 'Description',
            projectId,
            release: '2023-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 2',
            description: 'Description',
            projectId,
            release: '2024-12',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 3',
            description: 'Description',
            projectId,
            release: '2025-06',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toEqual(['2025-06', '2024-12', '2023-01'])
    })

    it('funciona com projeto que tem pacotes com releases duplicadas em diferentes momentos', async () => {
      // Criar pacotes com releases duplicadas em momentos diferentes
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Package 1',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 2',
            description: 'Description',
            projectId,
            release: '2024-02',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 3',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 4',
            description: 'Description',
            projectId,
            release: '2024-02',
            status: 'FAILED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toEqual(['2024-02', '2024-01'])
      expect(result).toHaveLength(2)
    })
  })

  describe('getProjectReleases - validação de tipos de retorno', () => {
    it('retorna array de strings', async () => {
      const result = await getProjectReleases({ projectId })

      expect(Array.isArray(result)).toBe(true)
      result.forEach(release => {
        expect(typeof release).toBe('string')
      })
    })

    it('retorna array vazio quando não há pacotes', async () => {
      const result = await getProjectReleases({ projectId })

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('retorna array com releases únicas', async () => {
      // Criar pacotes com releases duplicadas
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Package 1',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 2',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'PASSED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 3',
            description: 'Description',
            projectId,
            release: '2024-02',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toHaveLength(2)
      expect(result[0]).toBe('2024-02')
      expect(result[1]).toBe('2024-01')
    })

    it('retorna releases ordenadas por data decrescente', async () => {
      // Criar pacotes com releases em ordem específica
      await prisma.testPackage.createMany({
        data: [
          {
            title: 'Package 1',
            description: 'Description',
            projectId,
            release: '2024-01',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 2',
            description: 'Description',
            projectId,
            release: '2024-03',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          },
          {
            title: 'Package 3',
            description: 'Description',
            projectId,
            release: '2024-02',
            status: 'CREATED',
            type: 'FUNCTIONAL',
            priority: 'MEDIUM'
          }
        ]
      })

      const result = await getProjectReleases({ projectId })

      // Verificar se está ordenado por data decrescente
      expect(result).toEqual(['2024-03', '2024-02', '2024-01'])
    })
  })

  describe('getProjectReleases - casos de edge', () => {
    it('funciona com projeto que tem apenas um pacote', async () => {
      await prisma.testPackage.create({
        data: {
          title: 'Single Package',
          description: 'Description',
          projectId,
          release: '2024-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toEqual(['2024-01'])
      expect(result).toHaveLength(1)
    })

    it('funciona com projeto que tem pacotes com releases muito antigas', async () => {
      await prisma.testPackage.create({
        data: {
          title: 'Old Package',
          description: 'Description',
          projectId,
          release: '2020-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toEqual(['2020-01'])
    })

    it('funciona com projeto que tem pacotes com releases futuras', async () => {
      await prisma.testPackage.create({
        data: {
          title: 'Future Package',
          description: 'Description',
          projectId,
          release: '2030-01',
          status: 'CREATED',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM'
        }
      })

      const result = await getProjectReleases({ projectId })

      expect(result).toEqual(['2030-01'])
    })
  })
})
