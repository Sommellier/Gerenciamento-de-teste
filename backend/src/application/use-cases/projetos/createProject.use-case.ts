import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { Prisma } from '@prisma/client'

interface CreateProjectInput {
  ownerId: number
  name: string
  description?: string | null
}

type CreatedProject = Awaited<ReturnType<typeof prisma.project.create>>

export async function createProject({
  ownerId,
  name,
  description,
}: CreateProjectInput): Promise<CreatedProject> {
  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    throw new AppError('ownerId is required and must be a positive integer', 400)
  }

  if (typeof name !== 'string') {
    throw new AppError('Project name is required', 400)
  }

  const normalizedName = name.trim()
  const normalizedDescription =
    typeof description === 'string' ? (description.trim() || null) : description ?? null

  if (normalizedName.length < 2) {
    throw new AppError('Project name must be at least 2 characters long', 400)
  }
  if (normalizedName.length > 100) {
    throw new AppError('Project name must be at most 100 characters long', 400)
  }

  const nameRegex = /^[\p{L}\p{N}\s._-]+$/u
  if (!nameRegex.test(normalizedName)) {
    throw new AppError(
      'Project name contains invalid characters (allowed: letters, numbers, spaces, -, _, .)',
      400
    )
  }

  const duplicate = await prisma.project.findFirst({
    where: { ownerId, name: normalizedName },
    select: { id: true },
  })
  if (duplicate) {
    throw new AppError('A project with this name already exists for this owner', 409)
  }

  try {
    return await prisma.project.create({
      data: {
        ownerId,
        name: normalizedName,
        description: normalizedDescription,
      },
    })
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        throw new AppError('A project with this name already exists for this owner', 409)
      }
      if (err.code === 'P2003') {
        throw new AppError('Invalid ownerId (foreign key not found)', 400)
      }
    }
    throw new AppError('Failed to create project', 500)
  }
}
