import { prisma } from '../../../infrastructure/prisma'
import { getStepComments } from '../../../application/use-cases/execution/getStepComments.use-case'
import { AppError } from '../../../utils/AppError'

describe('getStepComments', () => {
  let projectId: number
  let scenarioId: number
  let stepId: number
  let userId: number
  let mentionedUserId: number

  beforeEach(async () => {
    // Criar usuário principal
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'user@example.com',
        password: 'password123'
      }
    })
    userId = user.id

    // Criar usuário mencionado
    const mentionedUser = await prisma.user.create({
      data: {
        name: 'Mentioned User',
        email: 'mentioned@example.com',
        password: 'password123'
      }
    })
    mentionedUserId = mentionedUser.id

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: userId
      }
    })
    projectId = project.id

    // Criar cenário
    const scenario = await prisma.testScenario.create({
      data: {
        title: 'Test Scenario',
        description: 'Test Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId
      }
    })
    scenarioId = scenario.id

    // Criar etapa
    const step = await prisma.testScenarioStep.create({
      data: {
        stepOrder: 1,
        action: 'Click button',
        expected: 'Button clicked',
        scenarioId
      }
    })
    stepId = step.id
  })

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.stepComment.deleteMany({
      where: {
        step: {
          scenario: {
            projectId
          }
        }
      }
    })
    await prisma.testScenarioStep.deleteMany({
      where: {
        scenario: {
          projectId
        }
      }
    })
    await prisma.testScenario.deleteMany({
      where: { projectId }
    })
    await prisma.project.deleteMany({
      where: { id: projectId }
    })
    await prisma.user.deleteMany({
      where: { id: { in: [userId, mentionedUserId] } }
    })
  })

  describe('getStepComments - casos de sucesso', () => {
    it('retorna lista vazia quando não há comentários', async () => {
      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(0)
      expect(Array.isArray(result)).toBe(true)
    })

    it('retorna comentários ordenados por data de criação (mais antigo primeiro)', async () => {
      // Criar múltiplos comentários
      const comments = []
      for (let i = 0; i < 3; i++) {
        const comment = await prisma.stepComment.create({
          data: {
            text: `Comentário ${i + 1}`,
            mentions: JSON.stringify([mentionedUserId]),
            stepId,
            userId
          }
        })
        comments.push(comment)
      }

      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(3)
      
      // Verificar se está ordenado por createdAt asc
      for (let i = 0; i < result.length - 1; i++) {
        expect(new Date(result[i].createdAt).getTime()).toBeLessThanOrEqual(
          new Date(result[i + 1].createdAt).getTime()
        )
      }
    })

    it('inclui dados do usuário para cada comentário', async () => {
      // Criar comentário
      await prisma.stepComment.create({
        data: {
          text: 'Comentário de teste',
          mentions: JSON.stringify([mentionedUserId]),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].user).toMatchObject({
        id: userId,
        name: 'Test User',
        email: 'user@example.com',
        avatar: null
      })
    })

    it('parse mentions corretamente', async () => {
      const mentions = [mentionedUserId, userId]
      
      await prisma.stepComment.create({
        data: {
          text: 'Comentário com menções',
          mentions: JSON.stringify(mentions),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].mentions).toEqual(mentions)
    })

    it('retorna mentions como array vazio quando não há mentions', async () => {
      await prisma.stepComment.create({
        data: {
          text: 'Comentário sem menções',
          mentions: null,
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].mentions).toEqual([])
    })

    it('retorna comentários com diferentes tipos de texto', async () => {
      const texts = [
        'Comentário simples',
        'Comentário com @menção',
        'Comentário com múltiplas linhas\nlinha 2\nlinha 3',
        'Comentário com emojis 🚀 ✅ ❌ 🎉',
        'Comentário com caracteres especiais @#$%^&*()_+{}|:"<>?[]\\;\',./'
      ]

      for (const text of texts) {
        await prisma.stepComment.create({
          data: {
            text,
            mentions: JSON.stringify([mentionedUserId]),
            stepId,
            userId
          }
        })
      }

      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(5)
      
      const resultTexts = result.map(comment => comment.text)
      texts.forEach(text => {
        expect(resultTexts).toContain(text)
      })
    })

    it('funciona com userId inválido (não afeta a operação)', async () => {
      await prisma.stepComment.create({
        data: {
          text: 'Comentário de teste',
          mentions: JSON.stringify([mentionedUserId]),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId: 99999 })

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Comentário de teste')
    })

    it('retorna comentários com texto longo', async () => {
      const longText = 'A'.repeat(1000)
      
      await prisma.stepComment.create({
        data: {
          text: longText,
          mentions: JSON.stringify([mentionedUserId]),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe(longText)
    })

    it('retorna comentários com mentions complexas', async () => {
      // Criar usuários adicionais
      const additionalUsers = []
      for (let i = 0; i < 3; i++) {
        const user = await prisma.user.create({
          data: {
            name: `User ${i + 1}`,
            email: `user${i + 1}@example.com`,
            password: 'password123'
          }
        })
        additionalUsers.push(user)
      }

      const allMentions = [userId, mentionedUserId, ...additionalUsers.map(u => u.id)]
      
      await prisma.stepComment.create({
        data: {
          text: 'Comentário com muitas menções',
          mentions: JSON.stringify(allMentions),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].mentions).toEqual(allMentions)

      // Limpar usuários adicionais
      await prisma.user.deleteMany({
        where: { id: { in: additionalUsers.map(u => u.id) } }
      })
    })
  })

  describe('getStepComments - casos de erro', () => {
    it('rejeita quando etapa não existe', async () => {
      await expect(getStepComments({ stepId: 99999, userId })).rejects.toThrow(
        new AppError('Etapa não encontrada', 404)
      )
    })

    it('rejeita quando stepId é inválido', async () => {
      await expect(getStepComments({ stepId: -1, userId })).rejects.toThrow(
        new AppError('Etapa não encontrada', 404)
      )
    })

    it('rejeita quando stepId é zero', async () => {
      await expect(getStepComments({ stepId: 0, userId })).rejects.toThrow(
        new AppError('Etapa não encontrada', 404)
      )
    })

    it('rejeita quando stepId é string inválida', async () => {
      await expect(getStepComments({ stepId: 'invalid' as any, userId })).rejects.toThrow()
    })

    it('rejeita quando stepId é null', async () => {
      await expect(getStepComments({ stepId: null as any, userId })).rejects.toThrow()
    })

    it('rejeita quando stepId é undefined', async () => {
      await expect(getStepComments({ stepId: undefined as any, userId })).rejects.toThrow()
    })
  })

  describe('getStepComments - casos especiais', () => {
    it('funciona com etapa que tem muitos comentários', async () => {
      // Criar muitos comentários
      const comments = []
      for (let i = 0; i < 10; i++) {
        const comment = await prisma.stepComment.create({
          data: {
            text: `Comentário ${i + 1}`,
            mentions: JSON.stringify([mentionedUserId]),
            stepId,
            userId
          }
        })
        comments.push(comment)
      }

      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(10)
      expect(Array.isArray(result)).toBe(true)
    })

    it('funciona com comentários criados por diferentes usuários', async () => {
      // Criar outro usuário
      const otherUser = await prisma.user.create({
        data: {
          name: 'Other User',
          email: 'other@example.com',
          password: 'password123'
        }
      })

      // Criar comentários com diferentes usuários
      await Promise.all([
        prisma.stepComment.create({
          data: {
            text: 'Comentário do usuário original',
            mentions: JSON.stringify([mentionedUserId]),
            stepId,
            userId
          }
        }),
        prisma.stepComment.create({
          data: {
            text: 'Comentário do outro usuário',
            mentions: JSON.stringify([userId]),
            stepId,
            userId: otherUser.id
          }
        })
      ])

      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(2)
      
      const commentByOtherUser = result.find(comment => comment.userId === otherUser.id)
      expect(commentByOtherUser).toBeTruthy()
      expect(commentByOtherUser?.user.name).toBe('Other User')

      // Limpar usuário adicional
      await prisma.user.delete({ where: { id: otherUser.id } })
    })

    it('não retorna comentários de outras etapas', async () => {
      // Criar outra etapa
      const otherStep = await prisma.testScenarioStep.create({
        data: {
          stepOrder: 2,
          action: 'Click other button',
          expected: 'Other button clicked',
          scenarioId
        }
      })

      // Criar comentários em ambas as etapas
      await Promise.all([
        prisma.stepComment.create({
          data: {
            text: 'Comentário na etapa original',
            mentions: JSON.stringify([mentionedUserId]),
            stepId,
            userId
          }
        }),
        prisma.stepComment.create({
          data: {
            text: 'Comentário na outra etapa',
            mentions: JSON.stringify([userId]),
            stepId: otherStep.id,
            userId
          }
        })
      ])

      const result = await getStepComments({ stepId, userId })

      // Deve retornar apenas comentários da etapa especificada
      expect(result).toHaveLength(1)
      expect(result[0].text).toBe('Comentário na etapa original')
    })

    it('funciona com mentions de usuários inexistentes', async () => {
      await prisma.stepComment.create({
        data: {
          text: 'Comentário com menção inexistente',
          mentions: JSON.stringify([99999]),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].mentions).toEqual([99999])
    })

    it('funciona com mentions duplicadas', async () => {
      await prisma.stepComment.create({
        data: {
          text: 'Comentário com menções duplicadas',
          mentions: JSON.stringify([mentionedUserId, mentionedUserId]),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].mentions).toEqual([mentionedUserId, mentionedUserId])
    })

    it('funciona com mentions JSON inválida', async () => {
      // Criar comentário com mentions JSON inválida
      await prisma.stepComment.create({
        data: {
          text: 'Comentário com mentions inválida',
          mentions: 'invalid json',
          stepId,
          userId
        }
      })

      // Deve lançar erro ao tentar fazer parse
      await expect(getStepComments({ stepId, userId })).rejects.toThrow()
    })

    it('funciona com comentários contendo caracteres especiais', async () => {
      const specialText = 'Comentário com @#$%^&*()_+{}|:"<>?[]\\;\',./'
      
      await prisma.stepComment.create({
        data: {
          text: specialText,
          mentions: JSON.stringify([mentionedUserId]),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe(specialText)
    })

    it('funciona com comentários contendo emojis', async () => {
      const emojiText = 'Comentário com emojis 🚀 ✅ ❌ 🎉'
      
      await prisma.stepComment.create({
        data: {
          text: emojiText,
          mentions: JSON.stringify([mentionedUserId]),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe(emojiText)
    })

    it('funciona com comentários contendo quebras de linha', async () => {
      const multilineText = 'Comentário\ncom\nquebras\nde\nlinha'
      
      await prisma.stepComment.create({
        data: {
          text: multilineText,
          mentions: JSON.stringify([mentionedUserId]),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].text).toBe(multilineText)
    })
  })

  describe('getStepComments - validação de tipos de retorno', () => {
    it('retorna array de objetos com propriedades corretas', async () => {
      await prisma.stepComment.create({
        data: {
          text: 'Comentário de teste',
          mentions: JSON.stringify([mentionedUserId]),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      result.forEach(comment => {
        expect(comment).toHaveProperty('id')
        expect(comment).toHaveProperty('text')
        expect(comment).toHaveProperty('mentions')
        expect(comment).toHaveProperty('stepId')
        expect(comment).toHaveProperty('userId')
        expect(comment).toHaveProperty('createdAt')
        expect(comment).toHaveProperty('updatedAt')
        expect(comment).toHaveProperty('user')
      })
    })

    it('retorna tipos corretos para propriedades', async () => {
      await prisma.stepComment.create({
        data: {
          text: 'Comentário de teste',
          mentions: JSON.stringify([mentionedUserId]),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      result.forEach(comment => {
        expect(typeof comment.id).toBe('number')
        expect(typeof comment.text).toBe('string')
        expect(Array.isArray(comment.mentions)).toBe(true)
        expect(typeof comment.stepId).toBe('number')
        expect(typeof comment.userId).toBe('number')
        expect(typeof comment.createdAt).toBe('object')
        expect(typeof comment.updatedAt).toBe('object')
        expect(typeof comment.user).toBe('object')
      })
    })

    it('retorna user com estrutura correta', async () => {
      await prisma.stepComment.create({
        data: {
          text: 'Comentário de teste',
          mentions: JSON.stringify([mentionedUserId]),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      result.forEach(comment => {
        expect(comment.user).toHaveProperty('id')
        expect(comment.user).toHaveProperty('name')
        expect(comment.user).toHaveProperty('email')
        expect(comment.user).toHaveProperty('avatar')
      })
    })

    it('retorna mentions parseadas corretamente', async () => {
      const mentions = [mentionedUserId, userId]
      
      await prisma.stepComment.create({
        data: {
          text: 'Comentário com menções',
          mentions: JSON.stringify(mentions),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      result.forEach(comment => {
        expect(Array.isArray(comment.mentions)).toBe(true)
        expect(comment.mentions).not.toBeInstanceOf(String)
      })
    })
  })

  describe('getStepComments - integração com banco de dados', () => {
    it('retorna dados consistentes com o banco', async () => {
      const mentions = [mentionedUserId, userId]
      
      const comment = await prisma.stepComment.create({
        data: {
          text: 'Comentário de teste',
          mentions: JSON.stringify(mentions),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(comment.id)
      expect(result[0].text).toBe('Comentário de teste')
      expect(result[0].mentions).toEqual(mentions)
    })

    it('retorna apenas comentários da etapa especificada', async () => {
      // Criar outra etapa
      const otherStep = await prisma.testScenarioStep.create({
        data: {
          stepOrder: 2,
          action: 'Click other button',
          expected: 'Other button clicked',
          scenarioId
        }
      })

      // Criar comentários em ambas as etapas
      await Promise.all([
        prisma.stepComment.create({
          data: {
            text: 'Comentário na etapa original',
            mentions: JSON.stringify([mentionedUserId]),
            stepId,
            userId
          }
        }),
        prisma.stepComment.create({
          data: {
            text: 'Comentário na outra etapa',
            mentions: JSON.stringify([userId]),
            stepId: otherStep.id,
            userId
          }
        })
      ])

      const result = await getStepComments({ stepId, userId })

      // Deve retornar apenas comentários da etapa especificada
      expect(result).toHaveLength(1)
      expect(result[0].stepId).toBe(stepId)
      expect(result[0].text).toBe('Comentário na etapa original')
    })

    it('retorna comentários ordenados corretamente', async () => {
      // Criar comentários com delay para garantir ordem diferente
      const comment1 = await prisma.stepComment.create({
        data: {
          text: 'Primeiro comentário',
          mentions: JSON.stringify([mentionedUserId]),
          stepId,
          userId
        }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      const comment2 = await prisma.stepComment.create({
        data: {
          text: 'Segundo comentário',
          mentions: JSON.stringify([userId]),
          stepId,
          userId
        }
      })

      const result = await getStepComments({ stepId, userId })

      // O primeiro comentário deve ser o primeiro (ordem asc)
      expect(result[0].id).toBe(comment1.id)
      expect(result[1].id).toBe(comment2.id)
    })
  })
})

