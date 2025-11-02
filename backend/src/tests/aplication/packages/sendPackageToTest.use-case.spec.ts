import { prisma } from '../../../infrastructure/prisma'
import { SendPackageToTestUseCase } from '../../../application/use-cases/packages/sendPackageToTest.use-case'
import { AppError } from '../../../utils/AppError'
import { Role, ScenarioType, Priority, PackageStatus } from '@prisma/client'

describe('SendPackageToTestUseCase', () => {
  let projectId: number
  let packageId: number
  let userId: number
  let ownerId: number
  const sendPackageToTestUseCase = new SendPackageToTestUseCase()

  beforeEach(async () => {
    // Criar usuário owner
    const owner = await prisma.user.create({
      data: {
        name: 'Owner User',
        email: `owner_${Date.now()}@example.com`,
        password: 'password123'
      }
    })
    ownerId = owner.id

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `user_${Date.now()}@example.com`,
        password: 'password123'
      }
    })
    userId = user.id

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: ownerId
      }
    })
    projectId = project.id

    // Criar pacote em REPROVADO
    const testPackage = await prisma.testPackage.create({
      data: {
        title: 'Test Package',
        description: 'Test Package Description',
        type: ScenarioType.FUNCTIONAL,
        priority: Priority.HIGH,
        release: '2024-01',
        status: PackageStatus.REPROVADO,
        projectId: projectId,
        rejectedById: ownerId,
        rejectedAt: new Date(),
        rejectionReason: 'Motivo anterior'
      }
    })
    packageId = testPackage.id
  })

  afterEach(async () => {
    // Limpar dados de teste
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
      where: { id: { in: [userId, ownerId] } }
    })
  })

  describe('SendPackageToTestUseCase - casos de sucesso', () => {
    it('envia pacote para teste quando está em REPROVADO', async () => {
      const result = await sendPackageToTestUseCase.execute({
        packageId,
        projectId,
        userId
      })

      expect(result.package).toMatchObject({
        id: packageId,
        status: PackageStatus.EM_TESTE
      })
    })

    it('mantém campos de reprovação para histórico', async () => {
      const result = await sendPackageToTestUseCase.execute({
        packageId,
        projectId,
        userId
      })

      expect(result.package.status).toBe(PackageStatus.EM_TESTE)
      // Campos de reprovação devem ser mantidos
      expect(result.package.rejectedById).toBe(ownerId)
      expect(result.package.rejectedAt).toBeDefined()
      expect(result.package.rejectionReason).toBe('Motivo anterior')
    })

    it('atualiza status no banco de dados', async () => {
      // Verificar status antes
      const packageBefore = await prisma.testPackage.findUnique({
        where: { id: packageId }
      })
      expect(packageBefore?.status).toBe(PackageStatus.REPROVADO)

      await sendPackageToTestUseCase.execute({
        packageId,
        projectId,
        userId
      })

      // Verificar status depois
      const packageAfter = await prisma.testPackage.findUnique({
        where: { id: packageId }
      })
      expect(packageAfter?.status).toBe(PackageStatus.EM_TESTE)
    })
  })

  describe('SendPackageToTestUseCase - casos de erro', () => {
    it('rejeita quando pacote não existe', async () => {
      await expect(sendPackageToTestUseCase.execute({
        packageId: 99999,
        projectId,
        userId
      })).rejects.toThrow(new AppError('Pacote não encontrado', 404))
    })

    it('rejeita quando pacote não pertence ao projeto', async () => {
      // Criar outro projeto
      const otherProject = await prisma.project.create({
        data: {
          name: 'Other Project',
          description: 'Other Description',
          ownerId: ownerId
        }
      })

      // Criar pacote no outro projeto
      const otherPackage = await prisma.testPackage.create({
        data: {
          title: 'Other Package',
          description: 'Other Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          release: '2024-01',
          status: PackageStatus.REPROVADO,
          projectId: otherProject.id
        }
      })

      await expect(sendPackageToTestUseCase.execute({
        packageId: otherPackage.id,
        projectId,
        userId
      })).rejects.toThrow(new AppError('Pacote não encontrado', 404))

      // Limpar
      await prisma.testPackage.delete({ where: { id: otherPackage.id } })
      await prisma.project.delete({ where: { id: otherProject.id } })
    })

    it('rejeita quando pacote não está em REPROVADO', async () => {
      // Atualizar pacote para outro status
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.CREATED
        }
      })

      await expect(sendPackageToTestUseCase.execute({
        packageId,
        projectId,
        userId
      })).rejects.toThrow(new AppError('Pacote deve estar em REPROVADO para ser reenviado para teste', 400))
    })

    it('rejeita quando pacote está em EM_TESTE', async () => {
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.EM_TESTE
        }
      })

      await expect(sendPackageToTestUseCase.execute({
        packageId,
        projectId,
        userId
      })).rejects.toThrow(new AppError('Pacote deve estar em REPROVADO para ser reenviado para teste', 400))
    })

    it('rejeita quando pacote está em APROVADO', async () => {
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.APROVADO
        }
      })

      await expect(sendPackageToTestUseCase.execute({
        packageId,
        projectId,
        userId
      })).rejects.toThrow(new AppError('Pacote deve estar em REPROVADO para ser reenviado para teste', 400))
    })

    it('rejeita quando pacote está em CREATED', async () => {
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.CREATED
        }
      })

      await expect(sendPackageToTestUseCase.execute({
        packageId,
        projectId,
        userId
      })).rejects.toThrow(new AppError('Pacote deve estar em REPROVADO para ser reenviado para teste', 400))
    })

    it('rejeita quando packageId é inválido', async () => {
      await expect(sendPackageToTestUseCase.execute({
        packageId: -1,
        projectId,
        userId
      })).rejects.toThrow()
    })

    it('rejeita quando packageId é zero', async () => {
      await expect(sendPackageToTestUseCase.execute({
        packageId: 0,
        projectId,
        userId
      })).rejects.toThrow()
    })

    it('rejeita quando projectId é inválido', async () => {
      await expect(sendPackageToTestUseCase.execute({
        packageId,
        projectId: -1,
        userId
      })).rejects.toThrow()
    })

    // Nota: userId não é validado no use-case, então não precisa testar aqui
    // A validação é feita no controller
  })

  describe('SendPackageToTestUseCase - casos especiais', () => {
    it('funciona com pacote que foi reprovado múltiplas vezes', async () => {
      // Atualizar para EM_TESTE primeiro
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.EM_TESTE
        }
      })

      // Reprovar novamente
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.REPROVADO,
          rejectedById: ownerId,
          rejectedAt: new Date(),
          rejectionReason: 'Segunda reprovação'
        }
      })

      const result = await sendPackageToTestUseCase.execute({
        packageId,
        projectId,
        userId
      })

      expect(result.package.status).toBe(PackageStatus.EM_TESTE)
      expect(result.package.rejectionReason).toBe('Segunda reprovação')
    })

    it('funciona com pacote que tem cenários', async () => {
      // Criar cenários
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: 'CREATED',
            projectId,
            packageId
          },
          {
            title: 'Scenario 2',
            description: 'Description 2',
            type: ScenarioType.REGRESSION,
            priority: Priority.MEDIUM,
            status: 'CREATED',
            projectId,
            packageId
          }
        ]
      })

      const result = await sendPackageToTestUseCase.execute({
        packageId,
        projectId,
        userId
      })

      expect(result.package.status).toBe(PackageStatus.EM_TESTE)
    })

    it('funciona independente do userId', async () => {
      // Criar outro usuário
      const otherUser = await prisma.user.create({
        data: {
          name: 'Other User',
          email: `other_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      const result = await sendPackageToTestUseCase.execute({
        packageId,
        projectId,
        userId: otherUser.id
      })

      expect(result.package.status).toBe(PackageStatus.EM_TESTE)

      // Limpar
      await prisma.user.delete({ where: { id: otherUser.id } })
    })
  })

  describe('SendPackageToTestUseCase - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const result = await sendPackageToTestUseCase.execute({
        packageId,
        projectId,
        userId
      })

      expect(result).toHaveProperty('package')
      expect(result.package).toHaveProperty('id')
      expect(result.package).toHaveProperty('status')
      expect(result.package).toHaveProperty('title')
      expect(result.package).toHaveProperty('description')
    })

    it('retorna tipos corretos para propriedades', async () => {
      const result = await sendPackageToTestUseCase.execute({
        packageId,
        projectId,
        userId
      })

      expect(typeof result.package.id).toBe('number')
      expect(typeof result.package.status).toBe('string')
      expect(typeof result.package.title).toBe('string')
    })
  })

  describe('SendPackageToTestUseCase - integração com banco de dados', () => {
    it('atualiza apenas o status do pacote', async () => {
      const packageBefore = await prisma.testPackage.findUnique({
        where: { id: packageId }
      })

      await sendPackageToTestUseCase.execute({
        packageId,
        projectId,
        userId
      })

      const packageAfter = await prisma.testPackage.findUnique({
        where: { id: packageId }
      })

      // Status mudou
      expect(packageAfter?.status).toBe(PackageStatus.EM_TESTE)
      expect(packageBefore?.status).toBe(PackageStatus.REPROVADO)

      // Outros campos permanecem iguais
      expect(packageAfter?.title).toBe(packageBefore?.title)
      expect(packageAfter?.description).toBe(packageBefore?.description)
      expect(packageAfter?.type).toBe(packageBefore?.type)
      expect(packageAfter?.priority).toBe(packageBefore?.priority)
      expect(packageAfter?.release).toBe(packageBefore?.release)
    })

    it('mantém histórico de reprovação', async () => {
      const rejectionReason = 'Motivo específico de reprovação'
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          rejectionReason
        }
      })

      await sendPackageToTestUseCase.execute({
        packageId,
        projectId,
        userId
      })

      const packageAfter = await prisma.testPackage.findUnique({
        where: { id: packageId }
      })

      expect(packageAfter?.status).toBe(PackageStatus.EM_TESTE)
      expect(packageAfter?.rejectionReason).toBe(rejectionReason)
      expect(packageAfter?.rejectedById).toBe(ownerId)
      expect(packageAfter?.rejectedAt).toBeDefined()
    })
  })
})

