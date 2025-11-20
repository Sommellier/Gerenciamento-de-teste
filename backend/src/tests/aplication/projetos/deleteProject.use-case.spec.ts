import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { deleteProject } from '../../../application/use-cases/projects/deleteProject.use-case'
import { createProject } from '../../../application/use-cases/projects/createProject.use-case'
import { createUser } from '../../../application/use-cases/user/createUser.use-case'
import fs from 'fs'
import path from 'path'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

let ownerA: number
let ownerB: number
let projectId: number

async function expectAppError(promise: Promise<any>, status: number, msg?: RegExp) {
  await expect(promise).rejects.toMatchObject({
    status,
    message: expect.any(String),
  })
  if (msg) await promise.catch((e) => expect(String(e.message)).toMatch(msg))
}

beforeEach(async () => {
  await prisma.passwordResetToken.deleteMany()
  await prisma.execution.deleteMany()
  await prisma.userOnProject.deleteMany()
  await prisma.testCase.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  const u1 = await createUser({
    name: 'Owner A',
    email: `${unique('ownA')}@example.com`,
    password: 'secret123'
  })
  const u2 = await createUser({
    name: 'Owner B',
    email: `${unique('ownB')}@example.com`,
    password: 'secret123'
  })

  ownerA = u1.id
  ownerB = u2.id

  const proj = await createProject({
    name: `Projeto ${unique('QA')}`,
    description: 'Projeto de testes',
    ownerId: ownerA
  })
  projectId = proj.id
  const tc = await prisma.testCase.create({
    data: {
      title: 'Caso 1',
      projectId,
      steps: 'Passo 1: Abrir o sistema',
      expected: 'O sistema deve abrir corretamente',
    },
  })

  await prisma.execution.create({
    data: {
      status: 'PENDING',
      testCase: { connect: { id: tc.id } },
      user: { connect: { id: ownerA } },
    },
  })
  // não criar membership do dono aqui; já é criado pelo createProject use case
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('deleteProject.use-case', () => {
  it('deve excluir o projeto quando o solicitante é o dono', async () => {
    await deleteProject({ projectId, requesterId: ownerA })

    const exists = await prisma.project.findUnique({ where: { id: projectId } })
    expect(exists).toBeNull()

    const tcs = await prisma.testCase.findMany({ where: { projectId } })
    const exs = await prisma.execution.findMany({ where: { testCase: { projectId } } }) // <- ajuste
    const uops = await prisma.userOnProject.findMany({ where: { projectId } })

    expect(tcs.length).toBe(0)
    expect(exs.length).toBe(0)
    expect(uops.length).toBe(0)
  })

  it('deve falhar com 404 se o projeto não existir', async () => {
    await expectAppError(
      deleteProject({ projectId: 999999, requesterId: ownerA }),
      404,
      /não encontrado/i
    )
  })

  it('deve falhar com 403 se o solicitante não é o dono', async () => {
    await expectAppError(
      deleteProject({ projectId, requesterId: ownerB }),
      403,
      /permissão|excluir/i
    )
  })

  it('deve deletar arquivos físicos de evidências ao deletar projeto', async () => {
    // Criar diretório de uploads se não existir
    const evidencesDir = path.join(process.cwd(), 'uploads', 'evidences')
    if (!fs.existsSync(evidencesDir)) {
      fs.mkdirSync(evidencesDir, { recursive: true })
    }

    // Criar cenário com etapa e evidência
    const scenario = await prisma.testScenario.create({
      data: {
        title: 'Cenário com evidência',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId,
        steps: {
          create: {
            stepOrder: 1,
            action: 'Ação',
            expected: 'Resultado esperado'
          }
        }
      },
      include: {
        steps: true
      }
    })

    const step = scenario.steps[0]

    // Criar arquivo físico de evidência
    const evidenceFilename = `evidence-${Date.now()}-${Math.random()}.png`
    const evidenceFilePath = path.join(evidencesDir, evidenceFilename)
    fs.writeFileSync(evidenceFilePath, Buffer.from('fake image content'))

    // Criar anexo no banco
    await prisma.stepAttachment.create({
      data: {
        filename: evidenceFilename,
        originalName: 'test.png',
        mimeType: 'image/png',
        size: 100,
        url: `/uploads/evidences/${evidenceFilename}`,
        stepId: step.id,
        uploadedBy: ownerA
      }
    })

    // Verificar que arquivo existe
    expect(fs.existsSync(evidenceFilePath)).toBe(true)

    // Deletar projeto
    await deleteProject({ projectId, requesterId: ownerA })

    // Verificar que arquivo foi deletado
    expect(fs.existsSync(evidenceFilePath)).toBe(false)
  })

  it('deve deletar arquivos físicos de anexos de bugs ao deletar projeto', async () => {
    // Criar diretório de uploads se não existir
    const bugAttachmentsDir = path.join(process.cwd(), 'uploads', 'bug-attachments')
    if (!fs.existsSync(bugAttachmentsDir)) {
      fs.mkdirSync(bugAttachmentsDir, { recursive: true })
    }

    // Criar cenário
    const scenario = await prisma.testScenario.create({
      data: {
        title: 'Cenário com bug',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId
      }
    })

    // Criar bug com anexo
    const bug = await prisma.bug.create({
      data: {
        title: 'Bug com anexo',
        severity: 'HIGH',
        scenarioId: scenario.id,
        projectId,
        createdBy: ownerA
      }
    })

    // Criar arquivo físico de anexo
    const attachmentFilename = `bug-attachment-${Date.now()}-${Math.random()}.pdf`
    const attachmentFilePath = path.join(bugAttachmentsDir, attachmentFilename)
    fs.writeFileSync(attachmentFilePath, Buffer.from('fake pdf content'))

    // Criar anexo no banco
    await prisma.bugAttachment.create({
      data: {
        filename: attachmentFilename,
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 100,
        url: `/uploads/bug-attachments/${attachmentFilename}`,
        bugId: bug.id,
        uploadedBy: ownerA
      }
    })

    // Verificar que arquivo existe
    expect(fs.existsSync(attachmentFilePath)).toBe(true)

    // Deletar projeto
    await deleteProject({ projectId, requesterId: ownerA })

    // Verificar que arquivo foi deletado
    expect(fs.existsSync(attachmentFilePath)).toBe(false)
  })

  it('deve continuar mesmo se arquivo físico de evidência não existir', async () => {
    // Criar cenário com etapa
    const scenario = await prisma.testScenario.create({
      data: {
        title: 'Cenário com evidência sem arquivo',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId,
        steps: {
          create: {
            stepOrder: 1,
            action: 'Ação',
            expected: 'Resultado esperado'
          }
        }
      },
      include: {
        steps: true
      }
    })

    const step = scenario.steps[0]

    // Criar anexo no banco sem arquivo físico
    await prisma.stepAttachment.create({
      data: {
        filename: 'non-existent-evidence.png',
        originalName: 'test.png',
        mimeType: 'image/png',
        size: 100,
        url: '/uploads/evidences/non-existent-evidence.png',
        stepId: step.id,
        uploadedBy: ownerA
      }
    })

    // Deletar projeto (não deve lançar erro mesmo sem arquivo físico)
    await deleteProject({ projectId, requesterId: ownerA })

    // Verificar que projeto foi deletado
    const deletedProject = await prisma.project.findUnique({
      where: { id: projectId }
    })
    expect(deletedProject).toBeNull()
  })

  it('deve continuar mesmo se arquivo físico de anexo de bug não existir', async () => {
    // Criar cenário
    const scenario = await prisma.testScenario.create({
      data: {
        title: 'Cenário com bug sem arquivo',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId
      }
    })

    // Criar bug com anexo sem arquivo físico
    const bug = await prisma.bug.create({
      data: {
        title: 'Bug com anexo sem arquivo',
        severity: 'MEDIUM',
        scenarioId: scenario.id,
        projectId,
        createdBy: ownerA,
        attachments: {
          create: {
            filename: 'non-existent-attachment.pdf',
            originalName: 'test.pdf',
            mimeType: 'application/pdf',
            size: 100,
            url: '/uploads/bug-attachments/non-existent-attachment.pdf',
            uploadedBy: ownerA
          }
        }
      }
    })

    // Deletar projeto (não deve lançar erro mesmo sem arquivo físico)
    await deleteProject({ projectId, requesterId: ownerA })

    // Verificar que projeto foi deletado
    const deletedProject = await prisma.project.findUnique({
      where: { id: projectId }
    })
    expect(deletedProject).toBeNull()
  })

  it('deve continuar mesmo se houver erro ao deletar arquivo físico de evidência', async () => {
    // Criar diretório de uploads se não existir
    const evidencesDir = path.join(process.cwd(), 'uploads', 'evidences')
    if (!fs.existsSync(evidencesDir)) {
      fs.mkdirSync(evidencesDir, { recursive: true })
    }

    // Criar cenário com etapa
    const scenario = await prisma.testScenario.create({
      data: {
        title: 'Cenário com evidência',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId,
        steps: {
          create: {
            stepOrder: 1,
            action: 'Ação',
            expected: 'Resultado esperado'
          }
        }
      },
      include: {
        steps: true
      }
    })

    const step = scenario.steps[0]

    // Criar arquivo físico
    const evidenceFilename = `evidence-${Date.now()}-${Math.random()}.png`
    const evidenceFilePath = path.join(evidencesDir, evidenceFilename)
    fs.writeFileSync(evidenceFilePath, Buffer.from('fake image content'))

    // Criar anexo no banco
    await prisma.stepAttachment.create({
      data: {
        filename: evidenceFilename,
        originalName: 'test.png',
        mimeType: 'image/png',
        size: 100,
        url: `/uploads/evidences/${evidenceFilename}`,
        stepId: step.id,
        uploadedBy: ownerA
      }
    })

    // Mock fs.unlinkSync para lançar erro
    const originalUnlinkSync = fs.unlinkSync
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    fs.unlinkSync = jest.fn(() => {
      throw new Error('Erro ao deletar arquivo')
    }) as any

    // Deletar projeto (deve continuar mesmo com erro ao deletar arquivo)
    await deleteProject({ projectId, requesterId: ownerA })

    // Verificar que console.error foi chamado
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Erro ao deletar arquivo de evidência'),
      expect.any(Error)
    )

    // Verificar que projeto foi deletado mesmo com erro no arquivo
    const deletedProject = await prisma.project.findUnique({
      where: { id: projectId }
    })
    expect(deletedProject).toBeNull()

    // Restaurar função original
    fs.unlinkSync = originalUnlinkSync
    consoleSpy.mockRestore()

    // Limpar arquivo se ainda existir
    if (fs.existsSync(evidenceFilePath)) {
      fs.unlinkSync(evidenceFilePath)
    }
  })

  it('deve continuar mesmo se houver erro ao deletar arquivo físico de anexo de bug', async () => {
    // Criar diretório de uploads se não existir
    const bugAttachmentsDir = path.join(process.cwd(), 'uploads', 'bug-attachments')
    if (!fs.existsSync(bugAttachmentsDir)) {
      fs.mkdirSync(bugAttachmentsDir, { recursive: true })
    }

    // Criar cenário
    const scenario = await prisma.testScenario.create({
      data: {
        title: 'Cenário com bug',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId
      }
    })

    // Criar bug com anexo
    const bug = await prisma.bug.create({
      data: {
        title: 'Bug com anexo',
        severity: 'HIGH',
        scenarioId: scenario.id,
        projectId,
        createdBy: ownerA
      }
    })

    // Criar arquivo físico
    const attachmentFilename = `bug-attachment-${Date.now()}-${Math.random()}.pdf`
    const attachmentFilePath = path.join(bugAttachmentsDir, attachmentFilename)
    fs.writeFileSync(attachmentFilePath, Buffer.from('fake pdf content'))

    // Criar anexo no banco
    await prisma.bugAttachment.create({
      data: {
        filename: attachmentFilename,
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 100,
        url: `/uploads/bug-attachments/${attachmentFilename}`,
        bugId: bug.id,
        uploadedBy: ownerA
      }
    })

    // Mock fs.unlinkSync para lançar erro
    const originalUnlinkSync = fs.unlinkSync
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    fs.unlinkSync = jest.fn(() => {
      throw new Error('Erro ao deletar arquivo')
    }) as any

    // Deletar projeto (deve continuar mesmo com erro ao deletar arquivo)
    await deleteProject({ projectId, requesterId: ownerA })

    // Verificar que console.error foi chamado
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Erro ao deletar arquivo de anexo de bug'),
      expect.any(Error)
    )

    // Verificar que projeto foi deletado mesmo com erro no arquivo
    const deletedProject = await prisma.project.findUnique({
      where: { id: projectId }
    })
    expect(deletedProject).toBeNull()

    // Restaurar função original
    fs.unlinkSync = originalUnlinkSync
    consoleSpy.mockRestore()

    // Limpar arquivo se ainda existir
    if (fs.existsSync(attachmentFilePath)) {
      fs.unlinkSync(attachmentFilePath)
    }
  })
})
