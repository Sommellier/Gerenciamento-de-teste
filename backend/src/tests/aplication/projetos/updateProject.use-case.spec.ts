import 'dotenv/config'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { updateProject } from '../../../application/use-cases/projetos/updateProject.use-case'

// Mock de prisma usado no use-case
jest.mock('../../../infrastructure/prisma', () => {
  return {
    prisma: {
      project: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $disconnect: jest.fn(),
    },
  }
})

import { prisma } from '../../../infrastructure/prisma'

const mockedFindUnique =
  prisma.project.findUnique as jest.MockedFunction<typeof prisma.project.findUnique>
const mockedFindFirst =
  prisma.project.findFirst as jest.MockedFunction<typeof prisma.project.findFirst>
const mockedUpdate =
  prisma.project.update as jest.MockedFunction<typeof prisma.project.update>

describe('updateProject.use-case (unit)', () => {
  const PROJECT_ID = 10
  const OWNER_ID = 100

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('atualiza nome e description (trim e null quando vazio)', async () => {
    mockedFindUnique.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: OWNER_ID,
      name: 'Old',
      description: 'Old desc',
    } as any)
    mockedFindFirst.mockResolvedValue(null)
    mockedUpdate.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: OWNER_ID,
      name: 'Novo Nome',
      description: null,
    } as any)

    const result = await updateProject({
      projectId: PROJECT_ID,
      requesterId: OWNER_ID,
      name: '  Novo Nome  ',
      description: '   ',
    })

    expect(mockedFindUnique).toHaveBeenCalledWith({ where: { id: PROJECT_ID } })
    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: { ownerId: OWNER_ID, name: 'Novo Nome', NOT: { id: PROJECT_ID } },
      select: { id: true },
    })
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: PROJECT_ID },
      data: { name: 'Novo Nome', description: null },
    })
    expect(result.name).toBe('Novo Nome')
    expect(result.description).toBeNull()
  })

  it('404 quando projeto não existe', async () => {
    mockedFindUnique.mockResolvedValue(null)

    await expect(
      updateProject({ projectId: PROJECT_ID, requesterId: OWNER_ID, name: 'X' })
    ).rejects.toMatchObject({ status: 404 })

    expect(mockedFindFirst).not.toHaveBeenCalled()
    expect(mockedUpdate).not.toHaveBeenCalled()
  })

  it('403 quando requester não é owner', async () => {
    mockedFindUnique.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: OWNER_ID,
      name: 'Old',
      description: null,
    } as any)

    await expect(
      updateProject({ projectId: PROJECT_ID, requesterId: 999, name: 'X' })
    ).rejects.toMatchObject({ status: 403 })

    expect(mockedFindFirst).not.toHaveBeenCalled()
    expect(mockedUpdate).not.toHaveBeenCalled()
  })

  it('400 quando name é fornecido mas vazio/whitespace', async () => {
    mockedFindUnique.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: OWNER_ID,
      name: 'Old',
      description: null,
    } as any)

    await expect(
      updateProject({ projectId: PROJECT_ID, requesterId: OWNER_ID, name: '   ' })
    ).rejects.toMatchObject({ status: 400 })
  })

  it('409 quando já existe projeto com mesmo nome para o mesmo owner', async () => {
    mockedFindUnique.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: OWNER_ID,
      name: 'Old',
      description: null,
    } as any)
    mockedFindFirst.mockResolvedValue({ id: 999 } as any)

    await expect(
      updateProject({ projectId: PROJECT_ID, requesterId: OWNER_ID, name: 'Conflito' })
    ).rejects.toMatchObject({ status: 409 })

    expect(mockedUpdate).not.toHaveBeenCalled()
  })

  it('400 quando nenhum campo foi enviado para atualizar', async () => {
    mockedFindUnique.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: OWNER_ID,
      name: 'Old',
      description: 'desc',
    } as any)

    await expect(
      updateProject({ projectId: PROJECT_ID, requesterId: OWNER_ID })
    ).rejects.toMatchObject({ status: 400 })

    expect(mockedFindFirst).not.toHaveBeenCalled()
    expect(mockedUpdate).not.toHaveBeenCalled()
  })

  it('atualiza apenas description quando name não vem', async () => {
    mockedFindUnique.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: OWNER_ID,
      name: 'Old',
      description: 'old',
    } as any)
    mockedUpdate.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: OWNER_ID,
      name: 'Old',
      description: 'nova',
    } as any)

    const result = await updateProject({
      projectId: PROJECT_ID,
      requesterId: OWNER_ID,
      description: '  nova  ',
    })

    expect(mockedFindFirst).not.toHaveBeenCalled()
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: PROJECT_ID },
      data: { description: 'nova' },
    })
    expect(result.description).toBe('nova')
  })

  it('mantém description inalterada quando undefined', async () => {
    mockedFindUnique.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: OWNER_ID,
      name: 'Old1',
      description: 'antiga',
    } as any)

    // Sem conflito de nome
    mockedFindFirst.mockResolvedValue(null)

    mockedUpdate.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: OWNER_ID,
      name: 'Old',
      description: 'antiga',
    } as any)

    const result = await updateProject({
      projectId: PROJECT_ID,
      requesterId: OWNER_ID,
      name: 'Old', // rename
      // description undefined
    })

    expect(mockedFindUnique).toHaveBeenCalledWith({ where: { id: PROJECT_ID } })
    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: { ownerId: OWNER_ID, name: 'Old', NOT: { id: PROJECT_ID } },
      select: { id: true },
    })
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: PROJECT_ID },
      data: { name: 'Old' }, // sem description
    })
    expect(result.description).toBe('antiga')
  })

  it('atualiza description para null quando enviado null', async () => {
    mockedFindUnique.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: OWNER_ID,
      name: 'Old',
      description: 'antiga',
    } as any)
    mockedUpdate.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: OWNER_ID,
      name: 'Old',
      description: null,
    } as any)

    const result = await updateProject({
      projectId: PROJECT_ID,
      requesterId: OWNER_ID,
      description: null,
    })

    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: PROJECT_ID },
      data: { description: null },
    })
    expect(result.description).toBeNull()
  })

  it('atualiza description aplicando trim corretamente', async () => {
    mockedFindUnique.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: OWNER_ID,
      name: 'Old',
      description: 'antiga',
    } as any)
    mockedUpdate.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: OWNER_ID,
      name: 'Old',
      description: 'nova',
    } as any)

    const result = await updateProject({
      projectId: PROJECT_ID,
      requesterId: OWNER_ID,
      description: '   nova   ',
    })

    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: PROJECT_ID },
      data: { description: 'nova' },
    })
    expect(result.description).toBe('nova')
  })
})
