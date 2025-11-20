import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import fs from 'fs'
import path from 'path'
import { logger } from '../../../utils/logger'

type Input = {
  projectId: number
  requesterId: number
}

export async function deleteProject({ projectId, requesterId }: Input): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  })

  if (!project) throw new AppError('Projeto não encontrado', 404)
  if (project.ownerId !== requesterId) throw new AppError('Você não tem permissão para excluir este projeto', 403)

  // Buscar todos os StepAttachment relacionados ao projeto (através dos cenários)
  const stepAttachments = await prisma.stepAttachment.findMany({
    where: {
      step: {
        scenario: {
          projectId
        }
      }
    },
    select: {
      filename: true
    }
  })

  // Buscar todos os BugAttachment relacionados ao projeto
  const bugAttachments = await prisma.bugAttachment.findMany({
    where: {
      bug: {
        projectId
      }
    },
    select: {
      filename: true
    }
  })

  // Deletar arquivos físicos de evidências
  for (const attachment of stepAttachments) {
    try {
      const filePath = path.join(process.cwd(), 'uploads', 'evidences', attachment.filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (fileError) {
      logger.error(`Erro ao deletar arquivo de evidência ${attachment.filename}:`, fileError)
      // Continuar mesmo se não conseguir deletar o arquivo
    }
  }

  // Deletar arquivos físicos de anexos de bugs
  for (const attachment of bugAttachments) {
    try {
      const filePath = path.join(process.cwd(), 'uploads', 'bug-attachments', attachment.filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (fileError) {
      logger.error(`Erro ao deletar arquivo de anexo de bug ${attachment.filename}:`, fileError)
      // Continuar mesmo se não conseguir deletar o arquivo
    }
  }

  // Deletar registros do banco (os arquivos físicos já foram deletados)
  await prisma.$transaction([
    prisma.execution.deleteMany({ where: { testCase: { projectId } } }),
    prisma.testCase.deleteMany({ where: { projectId } }),
    prisma.userOnProject.deleteMany({ where: { projectId } }),
    prisma.project.delete({ where: { id: projectId } }),
  ])
}
