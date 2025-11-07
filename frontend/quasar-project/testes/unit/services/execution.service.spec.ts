import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executionService } from 'src/services/execution.service'
import type { StepComment, StepAttachment, Bug, ExecutionHistory } from 'src/services/execution.service'
import api from 'src/services/api'

// Mock do api
vi.mock('src/services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Execution Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Comentários', () => {
    describe('addStepComment', () => {
      it('deve adicionar comentário com sucesso', async () => {
        const mockComment: StepComment = {
          id: 1,
          text: 'Comentário de teste',
          mentions: [],
          user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(api.post).mockResolvedValueOnce({
          data: { comment: mockComment },
        })

        const result = await executionService.addStepComment(1, 'Comentário de teste')

        expect(api.post).toHaveBeenCalledWith('/steps/1/comments', {
          text: 'Comentário de teste',
          mentions: undefined,
        })
        expect(result).toEqual(mockComment)
      })

      it('deve adicionar comentário com menções', async () => {
        const mockComment: StepComment = {
          id: 1,
          text: 'Comentário com @user1',
          mentions: [1, 2],
          user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(api.post).mockResolvedValueOnce({
          data: { comment: mockComment },
        })

        const result = await executionService.addStepComment(1, 'Comentário com @user1', [1, 2])

        expect(api.post).toHaveBeenCalledWith('/steps/1/comments', {
          text: 'Comentário com @user1',
          mentions: [1, 2],
        })
        expect(result).toEqual(mockComment)
      })
    })

    describe('getStepComments', () => {
      it('deve obter comentários com sucesso', async () => {
        const mockComments: StepComment[] = [
          {
            id: 1,
            text: 'Comentário 1',
            mentions: [],
            user: {
              id: 1,
              name: 'User 1',
              email: 'user1@example.com',
            },
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            text: 'Comentário 2',
            mentions: [1],
            user: {
              id: 2,
              name: 'User 2',
              email: 'user2@example.com',
            },
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
          },
        ]

        vi.mocked(api.get).mockResolvedValueOnce({
          data: { comments: mockComments },
        })

        const result = await executionService.getStepComments(1)

        expect(api.get).toHaveBeenCalledWith('/steps/1/comments')
        expect(result).toEqual(mockComments)
      })
    })
  })

  describe('Anexos/Evidências', () => {
    describe('uploadStepAttachment', () => {
      it('deve fazer upload de anexo com sucesso', async () => {
        const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })
        const mockAttachment: StepAttachment = {
          id: 1,
          filename: 'test.txt',
          originalName: 'test.txt',
          mimeType: 'text/plain',
          size: 7,
          url: '/uploads/test.txt',
          uploader: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
          },
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(api.post).mockResolvedValueOnce({
          data: { attachment: mockAttachment },
        })

        const result = await executionService.uploadStepAttachment(1, mockFile)

        expect(api.post).toHaveBeenCalledWith(
          '/steps/1/attachments',
          expect.any(FormData),
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        )
        expect(result).toEqual(mockAttachment)
      })
    })

    describe('getStepAttachments', () => {
      it('deve obter anexos com sucesso', async () => {
        const mockAttachments: StepAttachment[] = [
          {
            id: 1,
            filename: 'file1.txt',
            originalName: 'file1.txt',
            mimeType: 'text/plain',
            size: 100,
            url: '/uploads/file1.txt',
            uploader: {
              id: 1,
              name: 'User 1',
              email: 'user1@example.com',
            },
            createdAt: '2024-01-01T00:00:00Z',
          },
        ]

        vi.mocked(api.get).mockResolvedValueOnce({
          data: { attachments: mockAttachments },
        })

        const result = await executionService.getStepAttachments(1)

        expect(api.get).toHaveBeenCalledWith('/steps/1/attachments')
        expect(result).toEqual(mockAttachments)
      })
    })

    describe('deleteStepAttachment', () => {
      it('deve deletar anexo com sucesso', async () => {
        vi.mocked(api.delete).mockResolvedValueOnce(undefined)

        await executionService.deleteStepAttachment(1, 1)

        expect(api.delete).toHaveBeenCalledWith('/steps/1/attachments/1')
      })
    })
  })

  describe('Bugs', () => {
    describe('createBug', () => {
      it('deve criar bug com sucesso', async () => {
        const mockBug: Bug = {
          id: 1,
          title: 'Bug de teste',
          description: 'Descrição do bug',
          severity: 'HIGH',
          status: 'OPEN',
          relatedStepId: 1,
          creator: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(api.post).mockResolvedValueOnce({
          data: { bug: mockBug },
        })

        const result = await executionService.createBug(1, {
          title: 'Bug de teste',
          description: 'Descrição do bug',
          severity: 'HIGH',
          relatedStepId: 1,
        })

        expect(api.post).toHaveBeenCalledWith('/scenarios/1/bugs', {
          title: 'Bug de teste',
          description: 'Descrição do bug',
          severity: 'HIGH',
          relatedStepId: 1,
        })
        expect(result).toEqual(mockBug)
      })
    })

    describe('getBugs', () => {
      it('deve obter bugs com sucesso', async () => {
        const mockBugs: Bug[] = [
          {
            id: 1,
            title: 'Bug 1',
            severity: 'HIGH',
            status: 'OPEN',
            creator: {
              id: 1,
              name: 'User 1',
              email: 'user1@example.com',
            },
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ]

        vi.mocked(api.get).mockResolvedValueOnce({
          data: { bugs: mockBugs },
        })

        const result = await executionService.getBugs(1)

        expect(api.get).toHaveBeenCalledWith('/scenarios/1/bugs')
        expect(result).toEqual(mockBugs)
      })
    })

    describe('getPackageBugs', () => {
      it('deve obter bugs do pacote com sucesso', async () => {
        const mockBugs: Bug[] = [
          {
            id: 1,
            title: 'Bug 1',
            severity: 'HIGH',
            status: 'OPEN',
            creator: {
              id: 1,
              name: 'User 1',
              email: 'user1@example.com',
            },
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ]

        vi.mocked(api.get).mockResolvedValueOnce({
          data: { bugs: mockBugs },
        })

        const result = await executionService.getPackageBugs(1, 1)

        expect(api.get).toHaveBeenCalledWith('/projects/1/packages/1/bugs')
        expect(result).toEqual(mockBugs)
      })
    })

    describe('updateBug', () => {
      it('deve atualizar bug com sucesso', async () => {
        const mockBug: Bug = {
          id: 1,
          title: 'Bug atualizado',
          description: 'Nova descrição',
          severity: 'MEDIUM',
          status: 'IN_PROGRESS',
          creator: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        }

        vi.mocked(api.put).mockResolvedValueOnce({
          data: { bug: mockBug },
        })

        const result = await executionService.updateBug(1, {
          title: 'Bug atualizado',
          description: 'Nova descrição',
          severity: 'MEDIUM',
          status: 'IN_PROGRESS',
        })

        expect(api.put).toHaveBeenCalledWith('/bugs/1', {
          title: 'Bug atualizado',
          description: 'Nova descrição',
          severity: 'MEDIUM',
          status: 'IN_PROGRESS',
        })
        expect(result).toEqual(mockBug)
      })
    })

    describe('deleteBug', () => {
      it('deve deletar bug com sucesso', async () => {
        vi.mocked(api.delete).mockResolvedValueOnce(undefined)

        await executionService.deleteBug(1)

        expect(api.delete).toHaveBeenCalledWith('/bugs/1')
      })
    })

    describe('uploadBugAttachment', () => {
      it('deve fazer upload de anexo de bug com sucesso', async () => {
        const mockFile = new File(['content'], 'bug-attachment.txt', { type: 'text/plain' })
        const mockAttachment: StepAttachment = {
          id: 1,
          filename: 'bug-attachment.txt',
          originalName: 'bug-attachment.txt',
          mimeType: 'text/plain',
          size: 7,
          url: '/uploads/bug-attachment.txt',
          uploader: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
          },
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(api.post).mockResolvedValueOnce({
          data: { attachment: mockAttachment },
        })

        const result = await executionService.uploadBugAttachment(1, mockFile)

        expect(api.post).toHaveBeenCalledWith(
          '/bugs/1/attachments',
          expect.any(FormData),
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        )
        expect(result).toEqual(mockAttachment)
      })
    })
  })

  describe('Status da Etapa', () => {
    describe('updateStepStatus', () => {
      it('deve atualizar status da etapa com sucesso', async () => {
        const mockStep = {
          id: 1,
          status: 'PASSED',
          actualResult: 'Resultado esperado',
        }

        vi.mocked(api.put).mockResolvedValueOnce({
          data: { step: mockStep },
        })

        const result = await executionService.updateStepStatus(1, 'PASSED', 'Resultado esperado')

        expect(api.put).toHaveBeenCalledWith('/execution/steps/1/status', {
          status: 'PASSED',
          actualResult: 'Resultado esperado',
        })
        expect(result).toEqual(mockStep)
      })

      it('deve atualizar status sem resultado atual', async () => {
        const mockStep = {
          id: 1,
          status: 'FAILED',
        }

        vi.mocked(api.put).mockResolvedValueOnce({
          data: { step: mockStep },
        })

        const result = await executionService.updateStepStatus(1, 'FAILED')

        expect(api.put).toHaveBeenCalledWith('/execution/steps/1/status', {
          status: 'FAILED',
          actualResult: undefined,
        })
        expect(result).toEqual(mockStep)
      })
    })
  })

  describe('Histórico', () => {
    describe('registerHistory', () => {
      it('deve registrar histórico com sucesso', async () => {
        const mockHistory: ExecutionHistory = {
          id: 1,
          action: 'STEP_COMPLETED',
          description: 'Etapa concluída',
          metadata: { stepId: 1 },
          user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
          },
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(api.post).mockResolvedValueOnce({
          data: { history: mockHistory },
        })

        const result = await executionService.registerHistory(1, 'STEP_COMPLETED', 'Etapa concluída', { stepId: 1 })

        expect(api.post).toHaveBeenCalledWith('/scenarios/1/history', {
          action: 'STEP_COMPLETED',
          description: 'Etapa concluída',
          metadata: { stepId: 1 },
        })
        expect(result).toEqual(mockHistory)
      })

      it('deve registrar histórico sem descrição e metadata', async () => {
        const mockHistory: ExecutionHistory = {
          id: 1,
          action: 'SCENARIO_STARTED',
          user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
          },
          createdAt: '2024-01-01T00:00:00Z',
        }

        vi.mocked(api.post).mockResolvedValueOnce({
          data: { history: mockHistory },
        })

        const result = await executionService.registerHistory(1, 'SCENARIO_STARTED')

        expect(api.post).toHaveBeenCalledWith('/scenarios/1/history', {
          action: 'SCENARIO_STARTED',
          description: undefined,
          metadata: undefined,
        })
        expect(result).toEqual(mockHistory)
      })
    })

    describe('getHistory', () => {
      it('deve obter histórico com sucesso', async () => {
        const mockHistory: ExecutionHistory[] = [
          {
            id: 1,
            action: 'SCENARIO_STARTED',
            user: {
              id: 1,
              name: 'User 1',
              email: 'user1@example.com',
            },
            createdAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            action: 'STEP_COMPLETED',
            description: 'Etapa concluída',
            user: {
              id: 1,
              name: 'User 1',
              email: 'user1@example.com',
            },
            createdAt: '2024-01-02T00:00:00Z',
          },
        ]

        vi.mocked(api.get).mockResolvedValueOnce({
          data: { history: mockHistory },
        })

        const result = await executionService.getHistory(1)

        expect(api.get).toHaveBeenCalledWith('/scenarios/1/history')
        expect(result).toEqual(mockHistory)
      })
    })
  })
})

