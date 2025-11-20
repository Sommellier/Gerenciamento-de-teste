import 'dotenv/config'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { getProjectById } from '../../../application/use-cases/projects/getProjectById.use-case'

jest.mock('../../../infrastructure/prisma', () => {
  return {
    prisma: {
      project: { findUnique: jest.fn() },
      userOnProject: { findUnique: jest.fn() },
      $disconnect: jest.fn(),
    },
  }
})

import { prisma } from '../../../infrastructure/prisma'

const mockedProjectFindUnique =
  prisma.project.findUnique as jest.MockedFunction<typeof prisma.project.findUnique>

const mockedMembershipFindUnique =
  prisma.userOnProject.findUnique as jest.MockedFunction<typeof prisma.userOnProject.findUnique>

describe('getProjectById.use-case (unit)', () => {
  const PROJECT_ID = 123

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('retorna projeto quando requester é o OWNER (não consulta membership)', async () => {
    mockedProjectFindUnique.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: 10,
      name: 'Projeto X',
      description: null,
    } as any)

    const result = await getProjectById({ projectId: PROJECT_ID, requesterId: 10 })

    expect(result.id).toBe(PROJECT_ID)
    expect(mockedProjectFindUnique).toHaveBeenCalledWith({ where: { id: PROJECT_ID } })
    expect(mockedMembershipFindUnique).not.toHaveBeenCalled()
  })

  it('retorna projeto quando requester é membro (TESTER/APPROVER)', async () => {
    mockedProjectFindUnique.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: 10,
      name: 'Projeto X',
      description: null,
    } as any)

    mockedMembershipFindUnique.mockResolvedValue({ role: 'TESTER' } as any)

    const result = await getProjectById({ projectId: PROJECT_ID, requesterId: 20 })

    expect(result.id).toBe(PROJECT_ID)
    expect(mockedMembershipFindUnique).toHaveBeenCalledWith({
      where: { userId_projectId: { userId: 20, projectId: PROJECT_ID } },
      select: { role: true },
    })
  })

  it('lança 404 quando projeto não existe', async () => {
    mockedProjectFindUnique.mockResolvedValue(null)

    await expect(getProjectById({ projectId: PROJECT_ID, requesterId: 10 }))
      .rejects.toMatchObject({ status: 404 })

    expect(mockedMembershipFindUnique).not.toHaveBeenCalled()
  })

  it('lança 403 quando requester não é dono nem membro', async () => {
    mockedProjectFindUnique.mockResolvedValue({
      id: PROJECT_ID,
      ownerId: 10,
      name: 'Projeto X',
      description: null,
    } as any)

    mockedMembershipFindUnique.mockResolvedValue(null)

    await expect(getProjectById({ projectId: PROJECT_ID, requesterId: 99 }))
      .rejects.toMatchObject({ status: 403 })
  })
})
