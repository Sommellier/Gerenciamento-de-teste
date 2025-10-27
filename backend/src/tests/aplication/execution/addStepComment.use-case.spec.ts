import { prisma } from '../../../infrastructure/prisma'
import { addStepComment } from '../../../application/use-cases/execution/addStepComment.use-case'
import { AppError } from '../../../utils/AppError'

describe('addStepComment', () => {
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

  describe('addStepComment - casos de sucesso', () => {
    it('cria comentário com dados básicos', async () => {
      const commentData = {
        stepId,
        text: 'Este é um comentário de teste',
        userId
      }

      const result = await addStepComment(commentData)

      expect(result).toMatchObject({
        text: 'Este é um comentário de teste',
        stepId,
        userId,
        mentions: null
      })
      expect(result.user).toMatchObject({
        id: userId,
        name: 'Test User',
        email: 'user@example.com'
      })
    })

    it('cria comentário com menções', async () => {
      const commentData = {
        stepId,
        text: 'Comentário com menção @mentioned',
        mentions: [mentionedUserId],
        userId
      }

      const result = await addStepComment(commentData)

      expect(result).toMatchObject({
        text: 'Comentário com menção @mentioned',
        stepId,
        userId,
        mentions: JSON.stringify([mentionedUserId])
      })
    })

    it('cria comentário com múltiplas menções', async () => {
      // Criar usuário adicional
      const additionalUser = await prisma.user.create({
        data: {
          name: 'Additional User',
          email: 'additional@example.com',
          password: 'password123'
        }
      })

      const commentData = {
        stepId,
        text: 'Comentário com múltiplas menções',
        mentions: [mentionedUserId, additionalUser.id],
        userId
      }

      const result = await addStepComment(commentData)

      expect(result.mentions).toBe(JSON.stringify([mentionedUserId, additionalUser.id]))

      // Limpar usuário adicional
      await prisma.user.delete({ where: { id: additionalUser.id } })
    })

    it('cria comentário sem menções (array vazio)', async () => {
      const commentData = {
        stepId,
        text: 'Comentário sem menções',
        mentions: [],
        userId
      }

      const result = await addStepComment(commentData)

      expect(result.mentions).toBe(JSON.stringify([]))
    })

    it('cria comentário com texto longo', async () => {
      const longText = 'A'.repeat(1000)
      const commentData = {
        stepId,
        text: longText,
        userId
      }

      const result = await addStepComment(commentData)

      expect(result.text).toBe(longText)
    })

    it('inclui dados do usuário no resultado', async () => {
      const commentData = {
        stepId,
        text: 'Comentário de teste',
        userId
      }

      const result = await addStepComment(commentData)

      expect(result.user).toMatchObject({
        id: userId,
        name: 'Test User',
        email: 'user@example.com',
        avatar: null
      })
    })
  })

  describe('addStepComment - casos de erro', () => {
    it('rejeita quando etapa não existe', async () => {
      const commentData = {
        stepId: 99999,
        text: 'Comentário de teste',
        userId
      }

      await expect(addStepComment(commentData)).rejects.toThrow(
        new AppError('Etapa não encontrada', 404)
      )
    })

    it('rejeita quando stepId é inválido', async () => {
      const commentData = {
        stepId: -1,
        text: 'Comentário de teste',
        userId
      }

      await expect(addStepComment(commentData)).rejects.toThrow(
        new AppError('Etapa não encontrada', 404)
      )
    })

    it('rejeita quando stepId é zero', async () => {
      const commentData = {
        stepId: 0,
        text: 'Comentário de teste',
        userId
      }

      await expect(addStepComment(commentData)).rejects.toThrow(
        new AppError('Etapa não encontrada', 404)
      )
    })

    it('rejeita quando texto está vazio', async () => {
      const commentData = {
        stepId,
        text: '',
        userId
      }

      // Deve criar o comentário mesmo com texto vazio (validação de negócio)
      const result = await addStepComment(commentData)
      expect(result.text).toBe('')
    })

    it('rejeita quando userId é inválido', async () => {
      const commentData = {
        stepId,
        text: 'Comentário de teste',
        userId: 99999
      }

      // Deve lançar erro de foreign key constraint
      await expect(addStepComment(commentData)).rejects.toThrow()
    })
  })

  describe('addStepComment - casos especiais', () => {
    it('funciona com menções de usuários inexistentes', async () => {
      const commentData = {
        stepId,
        text: 'Comentário com menção inexistente',
        mentions: [99999],
        userId
      }

      const result = await addStepComment(commentData)

      expect(result.mentions).toBe(JSON.stringify([99999]))
    })

    it('funciona com menções duplicadas', async () => {
      const commentData = {
        stepId,
        text: 'Comentário com menções duplicadas',
        mentions: [mentionedUserId, mentionedUserId],
        userId
      }

      const result = await addStepComment(commentData)

      expect(result.mentions).toBe(JSON.stringify([mentionedUserId, mentionedUserId]))
    })

    it('funciona com texto contendo caracteres especiais', async () => {
      const specialText = 'Comentário com @#$%^&*()_+{}|:"<>?[]\\;\',./'
      const commentData = {
        stepId,
        text: specialText,
        userId
      }

      const result = await addStepComment(commentData)

      expect(result.text).toBe(specialText)
    })

    it('funciona com texto contendo emojis', async () => {
      const emojiText = 'Comentário com emojis 🚀 ✅ ❌ 🎉'
      const commentData = {
        stepId,
        text: emojiText,
        userId
      }

      const result = await addStepComment(commentData)

      expect(result.text).toBe(emojiText)
    })

    it('funciona com texto contendo quebras de linha', async () => {
      const multilineText = 'Comentário\ncom\nquebras\nde\nlinha'
      const commentData = {
        stepId,
        text: multilineText,
        userId
      }

      const result = await addStepComment(commentData)

      expect(result.text).toBe(multilineText)
    })
  })

  describe('addStepComment - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const commentData = {
        stepId,
        text: 'Comentário de teste',
        userId
      }

      const result = await addStepComment(commentData)

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('mentions')
      expect(result).toHaveProperty('stepId')
      expect(result).toHaveProperty('userId')
      expect(result).toHaveProperty('createdAt')
      expect(result).toHaveProperty('updatedAt')
      expect(result).toHaveProperty('user')
    })

    it('retorna tipos corretos para propriedades', async () => {
      const commentData = {
        stepId,
        text: 'Comentário de teste',
        userId
      }

      const result = await addStepComment(commentData)

      expect(typeof result.id).toBe('number')
      expect(typeof result.text).toBe('string')
      expect(typeof result.stepId).toBe('number')
      expect(typeof result.userId).toBe('number')
      expect(typeof result.createdAt).toBe('object')
      expect(typeof result.updatedAt).toBe('object')
      expect(typeof result.user).toBe('object')
    })

    it('retorna user com estrutura correta', async () => {
      const commentData = {
        stepId,
        text: 'Comentário de teste',
        userId
      }

      const result = await addStepComment(commentData)

      expect(result.user).toHaveProperty('id')
      expect(result.user).toHaveProperty('name')
      expect(result.user).toHaveProperty('email')
      expect(result.user).toHaveProperty('avatar')
    })
  })
})
