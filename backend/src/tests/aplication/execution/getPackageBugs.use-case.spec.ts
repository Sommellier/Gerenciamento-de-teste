import { prisma } from '../../../infrastructure/prisma'
import { getPackageBugs } from '../../../application/use-cases/execution/getPackageBugs.use-case'
import { AppError } from '../../../utils/AppError'

describe('getPackageBugs', () => {
  let projectId: number
  let packageId: number
  let scenarioIds: number[] = []
  let userId: number

  beforeEach(async () => {
    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'user@example.com',
        password: 'password123'
      }
    })
    userId = user.id

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: userId
      }
    })
    projectId = project.id

    // Criar pacote
    const testPackage = await prisma.testPackage.create({
      data: {
        title: 'Test Package',
        description: 'Test Package Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        release: '2024-01',
        projectId
      }
    })
    packageId = testPackage.id

    // Criar múltiplos cenários no pacote
    const scenarios = await Promise.all([
      prisma.testScenario.create({
        data: {
          title: 'Scenario 1',
          description: 'Description 1',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId,
          packageId
        }
      }),
      prisma.testScenario.create({
        data: {
          title: 'Scenario 2',
          description: 'Description 2',
          type: 'FUNCTIONAL',
          priority: 'MEDIUM',
          projectId,
          packageId
        }
      }),
      prisma.testScenario.create({
        data: {
          title: 'Scenario 3',
          description: 'Description 3',
          type: 'FUNCTIONAL',
          priority: 'LOW',
          projectId,
          packageId
        }
      })
    ])

    scenarioIds = scenarios.map(s => s.id)
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.bug.deleteMany({
      where: {
        scenario: {
          projectId
        }
      }
    })
    await prisma.testScenario.deleteMany({
      where: { projectId }
    })
    await prisma.testPackage.deleteMany({
      where: { projectId }
    })
    await prisma.project.deleteMany({
      where: { id: projectId }
    })
    await prisma.user.deleteMany({
      where: { id: userId }
    })
  })

  describe('getPackageBugs - casos de sucesso', () => {
    it('retorna lista vazia quando não há bugs', async () => {
      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(result).toHaveLength(0)
      expect(Array.isArray(result)).toBe(true)
    })

    it('retorna bugs de todos os cenários do pacote', async () => {
      // Criar bugs em diferentes cenários
      const bugs = await Promise.all([
        prisma.bug.create({
          data: {
            title: 'Bug 1',
            description: 'Bug no cenário 1',
            severity: 'HIGH',
            scenarioId: scenarioIds[0],
            projectId,
            createdBy: userId
          }
        }),
        prisma.bug.create({
          data: {
            title: 'Bug 2',
            description: 'Bug no cenário 2',
            severity: 'MEDIUM',
            scenarioId: scenarioIds[1],
            projectId,
            createdBy: userId
          }
        }),
        prisma.bug.create({
          data: {
            title: 'Bug 3',
            description: 'Bug no cenário 3',
            severity: 'LOW',
            scenarioId: scenarioIds[2],
            projectId,
            createdBy: userId
          }
        })
      ])

      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(result).toHaveLength(3)
      
      const titles = result.map(bug => bug.title).sort()
      expect(titles).toEqual(['Bug 1', 'Bug 2', 'Bug 3'])
    })

    it('retorna bugs ordenados por data de criação (mais recente primeiro)', async () => {
      // Criar bugs com delay para garantir ordem diferente
      const bug1 = await prisma.bug.create({
        data: {
          title: 'Bug 1',
          severity: 'HIGH',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId
        }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      const bug2 = await prisma.bug.create({
        data: {
          title: 'Bug 2',
          severity: 'MEDIUM',
          scenarioId: scenarioIds[1],
          projectId,
          createdBy: userId
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(result).toHaveLength(2)
      
      // Verificar se está ordenado por createdAt desc
      expect(result[0].id).toBe(bug2.id)
      expect(result[1].id).toBe(bug1.id)
    })

    it('inclui dados do criador para cada bug', async () => {
      await prisma.bug.create({
        data: {
          title: 'Bug de teste',
          severity: 'HIGH',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].creator).toMatchObject({
        id: userId,
        name: 'Test User',
        email: 'user@example.com',
        avatar: null
      })
    })

    it('inclui dados do cenário para cada bug', async () => {
      await prisma.bug.create({
        data: {
          title: 'Bug de teste',
          severity: 'HIGH',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].scenario).toMatchObject({
        id: scenarioIds[0],
        title: 'Scenario 1'
      })
    })

    it('retorna bugs com diferentes severidades', async () => {
      const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

      for (let i = 0; i < severities.length; i++) {
        await prisma.bug.create({
          data: {
            title: `Bug ${severities[i]}`,
            severity: severities[i],
            scenarioId: scenarioIds[i % scenarioIds.length],
            projectId,
            createdBy: userId
          }
        })
      }

      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(result).toHaveLength(4)
      
      const resultSeverities = result.map(bug => bug.severity)
      severities.forEach(severity => {
        expect(resultSeverities).toContain(severity)
      })
    })

    it('retorna bugs com e sem descrição', async () => {
      await Promise.all([
        prisma.bug.create({
          data: {
            title: 'Bug com descrição',
            description: 'Descrição do bug',
            severity: 'HIGH',
            scenarioId: scenarioIds[0],
            projectId,
            createdBy: userId
          }
        }),
        prisma.bug.create({
          data: {
            title: 'Bug sem descrição',
            severity: 'MEDIUM',
            scenarioId: scenarioIds[1],
            projectId,
            createdBy: userId
          }
        })
      ])

      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(result).toHaveLength(2)
      
      const bugWithDescription = result.find(bug => bug.description)
      const bugWithoutDescription = result.find(bug => !bug.description)
      
      expect(bugWithDescription).toBeTruthy()
      expect(bugWithoutDescription).toBeTruthy()
    })

    it('funciona com userId inválido (não afeta a operação)', async () => {
      await prisma.bug.create({
        data: {
          title: 'Bug de teste',
          severity: 'HIGH',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId: 99999 })

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Bug de teste')
    })

    it('retorna bugs com etapa relacionada', async () => {
      // Criar etapa
      const step = await prisma.testScenarioStep.create({
        data: {
          stepOrder: 1,
          action: 'Click button',
          expected: 'Button clicked',
          scenarioId: scenarioIds[0]
        }
      })

      await prisma.bug.create({
        data: {
          title: 'Bug com etapa relacionada',
          severity: 'HIGH',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId,
          relatedStepId: step.id
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].relatedStepId).toBe(step.id)
    })
  })

  describe('getPackageBugs - casos de erro', () => {
    it('rejeita quando pacote não existe', async () => {
      await expect(getPackageBugs({ packageId: 99999, projectId, userId })).rejects.toThrow(
        new AppError('Pacote não encontrado', 404)
      )
    })

    it('rejeita quando pacote não pertence ao projeto', async () => {
      // Criar outro projeto
      const otherProject = await prisma.project.create({
        data: {
          name: 'Other Project',
          description: 'Other Description',
          ownerId: userId
        }
      })

      // Criar pacote no outro projeto
      const otherPackage = await prisma.testPackage.create({
        data: {
          title: 'Other Package',
          description: 'Other Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          release: '2024-01',
          projectId: otherProject.id
        }
      })

      await expect(getPackageBugs({ packageId: otherPackage.id, projectId, userId })).rejects.toThrow(
        new AppError('Pacote não encontrado', 404)
      )

      // Limpar dados adicionais
      await prisma.testPackage.deleteMany({
        where: { projectId: otherProject.id }
      })
      await prisma.project.deleteMany({
        where: { id: otherProject.id }
      })
    })

    it('rejeita quando packageId é inválido', async () => {
      await expect(getPackageBugs({ packageId: -1, projectId, userId })).rejects.toThrow(
        new AppError('Pacote não encontrado', 404)
      )
    })

    it('rejeita quando packageId é zero', async () => {
      await expect(getPackageBugs({ packageId: 0, projectId, userId })).rejects.toThrow(
        new AppError('Pacote não encontrado', 404)
      )
    })

    it('rejeita quando projectId é inválido', async () => {
      await expect(getPackageBugs({ packageId, projectId: -1, userId })).rejects.toThrow(
        new AppError('Pacote não encontrado', 404)
      )
    })

    it('rejeita quando projectId é zero', async () => {
      await expect(getPackageBugs({ packageId, projectId: 0, userId })).rejects.toThrow(
        new AppError('Pacote não encontrado', 404)
      )
    })
  })

  describe('getPackageBugs - casos especiais', () => {
    it('funciona com pacote que tem muitos bugs', async () => {
      // Criar muitos bugs
      const bugs = []
      for (let i = 0; i < 10; i++) {
        const bug = await prisma.bug.create({
          data: {
            title: `Bug ${i + 1}`,
            severity: 'MEDIUM',
            scenarioId: scenarioIds[i % scenarioIds.length],
            projectId,
            createdBy: userId
          }
        })
        bugs.push(bug)
      }

      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(result).toHaveLength(10)
      expect(Array.isArray(result)).toBe(true)
    })

    it('funciona com bugs criados por diferentes usuários', async () => {
      // Criar outro usuário
      const otherUser = await prisma.user.create({
        data: {
          name: 'Other User',
          email: 'other@example.com',
          password: 'password123'
        }
      })

      // Criar bugs com diferentes usuários
      await Promise.all([
        prisma.bug.create({
          data: {
            title: 'Bug do usuário original',
            severity: 'HIGH',
            scenarioId: scenarioIds[0],
            projectId,
            createdBy: userId
          }
        }),
        prisma.bug.create({
          data: {
            title: 'Bug do outro usuário',
            severity: 'MEDIUM',
            scenarioId: scenarioIds[1],
            projectId,
            createdBy: otherUser.id
          }
        })
      ])

      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(result).toHaveLength(2)
      
      const bugByOtherUser = result.find(bug => bug.createdBy === otherUser.id)
      expect(bugByOtherUser).toBeTruthy()
      expect(bugByOtherUser?.creator.name).toBe('Other User')

      // Limpar usuário adicional
      await prisma.user.delete({ where: { id: otherUser.id } })
    })

    it('não retorna bugs de cenários fora do pacote', async () => {
      // Criar cenário fora do pacote
      const scenarioOutsidePackage = await prisma.testScenario.create({
        data: {
          title: 'Scenario Outside Package',
          description: 'Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId
          // Não tem packageId
        }
      })

      // Criar bug no cenário fora do pacote
      await prisma.bug.create({
        data: {
          title: 'Bug fora do pacote',
          severity: 'HIGH',
          scenarioId: scenarioOutsidePackage.id,
          projectId,
          createdBy: userId
        }
      })

      // Criar bug dentro do pacote
      await prisma.bug.create({
        data: {
          title: 'Bug dentro do pacote',
          severity: 'MEDIUM',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId })

      // Deve retornar apenas o bug dentro do pacote
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Bug dentro do pacote')
    })

    it('funciona com bugs com títulos longos', async () => {
      const longTitle = 'A'.repeat(255)
      
      await prisma.bug.create({
        data: {
          title: longTitle,
          severity: 'HIGH',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe(longTitle)
    })

    it('funciona com bugs com descrições longas', async () => {
      const longDescription = 'A'.repeat(1000)
      
      await prisma.bug.create({
        data: {
          title: 'Bug com descrição longa',
          description: longDescription,
          severity: 'MEDIUM',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].description).toBe(longDescription)
    })

    it('funciona com bugs contendo caracteres especiais', async () => {
      const specialTitle = 'Bug com @#$%^&*()_+{}|:"<>?[]\\;\',./'
      
      await prisma.bug.create({
        data: {
          title: specialTitle,
          severity: 'LOW',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe(specialTitle)
    })

    it('funciona com bugs contendo emojis', async () => {
      const emojiTitle = 'Bug com emojis 🐛 🚀 ✅ ❌ 🎉'
      
      await prisma.bug.create({
        data: {
          title: emojiTitle,
          severity: 'HIGH',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe(emojiTitle)
    })
  })

  describe('getPackageBugs - validação de tipos de retorno', () => {
    it('retorna array de objetos com propriedades corretas', async () => {
      await prisma.bug.create({
        data: {
          title: 'Bug de teste',
          severity: 'HIGH',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      result.forEach(bug => {
        expect(bug).toHaveProperty('id')
        expect(bug).toHaveProperty('title')
        expect(bug).toHaveProperty('description')
        expect(bug).toHaveProperty('severity')
        expect(bug).toHaveProperty('scenarioId')
        expect(bug).toHaveProperty('projectId')
        expect(bug).toHaveProperty('createdBy')
        expect(bug).toHaveProperty('createdAt')
        expect(bug).toHaveProperty('updatedAt')
        expect(bug).toHaveProperty('creator')
        expect(bug).toHaveProperty('scenario')
      })
    })

    it('retorna tipos corretos para propriedades', async () => {
      await prisma.bug.create({
        data: {
          title: 'Bug de teste',
          severity: 'HIGH',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId })

      result.forEach(bug => {
        expect(typeof bug.id).toBe('number')
        expect(typeof bug.title).toBe('string')
        expect(typeof bug.severity).toBe('string')
        expect(typeof bug.scenarioId).toBe('number')
        expect(typeof bug.projectId).toBe('number')
        expect(typeof bug.createdBy).toBe('number')
        expect(typeof bug.createdAt).toBe('object')
        expect(typeof bug.updatedAt).toBe('object')
        expect(typeof bug.creator).toBe('object')
        expect(typeof bug.scenario).toBe('object')
      })
    })

    it('retorna creator com estrutura correta', async () => {
      await prisma.bug.create({
        data: {
          title: 'Bug de teste',
          severity: 'HIGH',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId })

      result.forEach(bug => {
        expect(bug.creator).toHaveProperty('id')
        expect(bug.creator).toHaveProperty('name')
        expect(bug.creator).toHaveProperty('email')
        expect(bug.creator).toHaveProperty('avatar')
      })
    })

    it('retorna scenario com estrutura correta', async () => {
      await prisma.bug.create({
        data: {
          title: 'Bug de teste',
          severity: 'HIGH',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId })

      result.forEach(bug => {
        expect(bug.scenario).toHaveProperty('id')
        expect(bug.scenario).toHaveProperty('title')
      })
    })
  })

  describe('getPackageBugs - integração com banco de dados', () => {
    it('retorna dados consistentes com o banco', async () => {
      const bug = await prisma.bug.create({
        data: {
          title: 'Bug de teste',
          description: 'Descrição do bug',
          severity: 'HIGH',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(bug.id)
      expect(result[0].title).toBe('Bug de teste')
      expect(result[0].description).toBe('Descrição do bug')
      expect(result[0].severity).toBe('HIGH')
    })

    it('retorna apenas bugs do pacote especificado', async () => {
      // Criar outro pacote
      const otherPackage = await prisma.testPackage.create({
        data: {
          title: 'Other Package',
          description: 'Other Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          release: '2024-01',
          projectId
        }
      })

      // Criar cenário no outro pacote
      const otherScenario = await prisma.testScenario.create({
        data: {
          title: 'Other Scenario',
          description: 'Other Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId,
          packageId: otherPackage.id
        }
      })

      // Criar bugs em ambos os pacotes
      await Promise.all([
        prisma.bug.create({
          data: {
            title: 'Bug no pacote original',
            severity: 'HIGH',
            scenarioId: scenarioIds[0],
            projectId,
            createdBy: userId
          }
        }),
        prisma.bug.create({
          data: {
            title: 'Bug no outro pacote',
            severity: 'MEDIUM',
            scenarioId: otherScenario.id,
            projectId,
            createdBy: userId
          }
        })
      ])

      const result = await getPackageBugs({ packageId, projectId, userId })

      // Deve retornar apenas bugs do pacote especificado
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Bug no pacote original')
    })

    it('retorna bugs ordenados corretamente', async () => {
      // Criar bugs com delay para garantir ordem diferente
      const bug1 = await prisma.bug.create({
        data: {
          title: 'Bug 1',
          severity: 'HIGH',
          scenarioId: scenarioIds[0],
          projectId,
          createdBy: userId
        }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      const bug2 = await prisma.bug.create({
        data: {
          title: 'Bug 2',
          severity: 'MEDIUM',
          scenarioId: scenarioIds[1],
          projectId,
          createdBy: userId
        }
      })

      const result = await getPackageBugs({ packageId, projectId, userId })

      // O bug mais recente deve ser o primeiro
      expect(result[0].id).toBe(bug2.id)
      expect(result[1].id).toBe(bug1.id)
    })
  })
})
