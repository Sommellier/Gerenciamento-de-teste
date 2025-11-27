import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { sanitizeTextOnly, sanitizeString } from '../../../utils/validation'

type Input = {
  projectId: number
  requesterId: number
  name?: string
  description?: string | null
}

export async function updateProject({ projectId, requesterId, name, description }: Input) {

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new AppError('Projeto não encontrado', 404)

  if (project.ownerId !== requesterId) {
    throw new AppError('Apenas o dono do projeto pode editar', 403)
  }

  const data: { name?: string; description?: string | null } = {}

  if (name !== undefined) {
    const trimmed = sanitizeTextOnly(String(name).trim())
    if (!trimmed) throw new AppError('Nome do projeto não pode ser vazio', 400)
    data.name = trimmed

    const conflict = await prisma.project.findFirst({
      where: {
        ownerId: project.ownerId,
        name: trimmed,
        NOT: { id: projectId },
      },
      select: { id: true },
    })
    if (conflict) throw new AppError('Já existe um projeto com este nome para este dono', 409)
  }

  if (description !== undefined) {
    if (description === null) {
      data.description = null
    } else {
      const trimmedDesc = sanitizeString(String(description).trim())
      data.description = trimmedDesc === '' ? null : trimmedDesc
    }
  }

  if (Object.keys(data).length === 0) {
    throw new AppError('Nada para atualizar', 400)
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data,
  })

  return updated
}

