import { prisma } from '../../../infrastructure/prisma'
import { ApprovePackageUseCase } from '../../../application/use-cases/packages/approvePackage.use-case'
import { AppError } from '../../../utils/AppError'
import { Role, ScenarioType, Priority, ScenarioStatus, PackageStatus } from '@prisma/client'

describe('ApprovePackageUseCase', () => {
  let projectId: number
  let packageId: number
  let ownerId: number
  let managerId: number
  let testerId: number
  let approverId: number
  const approvePackageUseCase = new ApprovePackageUseCase()

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

    // Criar usuário manager
    const manager = await prisma.user.create({
      data: {
        name: 'Manager User',
        email: `manager_${Date.now()}@example.com`,
        password: 'password123'
      }
    })
    managerId = manager.id

    // Criar usuário tester
    const tester = await prisma.user.create({
      data: {
        name: 'Tester User',
        email: `tester_${Date.now()}@example.com`,
        password: 'password123'
      }
    })
    testerId = tester.id

    // Criar usuário approver (será manager)
    approverId = managerId

    // Criar projeto
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: ownerId
      }
    })
    projectId = project.id

    // Adicionar manager ao projeto
    await prisma.userOnProject.create({
      data: {
        userId: managerId,
        projectId: projectId,
        role: Role.MANAGER
      }
    })

    // Criar pacote
    const testPackage = await prisma.testPackage.create({
      data: {
        title: 'Test Package',
        description: 'Test Package Description',
        type: ScenarioType.FUNCTIONAL,
        priority: Priority.HIGH,
        release: '2024-01',
        status: PackageStatus.CREATED,
        projectId: projectId
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
    await prisma.userOnProject.deleteMany({
      where: { projectId }
    })
    await prisma.project.deleteMany({
      where: { id: projectId }
    })
    await prisma.user.deleteMany({
      where: { id: { in: [ownerId, managerId, testerId] } }
    })
  })

  describe('ApprovePackageUseCase - casos de sucesso', () => {
    it('aprova pacote quando owner aprova e todos os cenários estão aprovados', async () => {
      // Criar cenários com status APPROVED
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          },
          {
            title: 'Scenario 2',
            description: 'Description 2',
            type: ScenarioType.REGRESSION,
            priority: Priority.MEDIUM,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          }
        ]
      })

      const result = await approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: ownerId
      })

      expect(result.package).toMatchObject({
        id: packageId,
        status: PackageStatus.APROVADO,
        approvedById: ownerId
      })
      expect(result.package.approvedBy).toMatchObject({
        id: ownerId,
        name: 'Owner User'
      })
      expect(result.package.approvedAt).toBeDefined()
      expect(result.package.rejectedById).toBeNull()
      expect(result.package.rejectedAt).toBeNull()
      expect(result.package.rejectionReason).toBeNull()
    })

    it('aprova pacote quando manager aprova e todos os cenários estão aprovados', async () => {
      // Criar cenários com status APPROVED
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          }
        ]
      })

      const result = await approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: managerId
      })

      expect(result.package).toMatchObject({
        id: packageId,
        status: PackageStatus.APROVADO,
        approvedById: managerId
      })
      expect(result.package.approvedBy).toMatchObject({
        id: managerId,
        name: 'Manager User'
      })
    })

    it('limpa campos de reprovação quando aprova', async () => {
      // Criar pacote reprovado anteriormente
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.REPROVADO,
          rejectedById: ownerId,
          rejectedAt: new Date(),
          rejectionReason: 'Motivo anterior'
        }
      })

      // Criar cenários com status APPROVED
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          }
        ]
      })

      const result = await approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: ownerId
      })

      expect(result.package.status).toBe(PackageStatus.APROVADO)
      expect(result.package.rejectedById).toBeNull()
      expect(result.package.rejectedAt).toBeNull()
      expect(result.package.rejectionReason).toBeNull()
    })

    it('inclui cenários no retorno', async () => {
      // Criar cenários com status APPROVED
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Scenario 1',
          description: 'Description 1',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.APPROVED,
          projectId,
          packageId
        }
      })

      const result = await approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: ownerId
      })

      expect(result.package.scenarios).toHaveLength(1)
      expect(result.package.scenarios[0]).toMatchObject({
        id: scenario.id,
        title: 'Scenario 1'
      })
    })
  })

  describe('ApprovePackageUseCase - casos de erro', () => {
    it('rejeita quando pacote não existe', async () => {
      await expect(approvePackageUseCase.execute({
        packageId: 99999,
        projectId,
        approverId: ownerId
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
          projectId: otherProject.id
        }
      })

      await expect(approvePackageUseCase.execute({
        packageId: otherPackage.id,
        projectId,
        approverId: ownerId
      })).rejects.toThrow(new AppError('Pacote não encontrado', 404))

      // Limpar
      await prisma.testPackage.delete({ where: { id: otherPackage.id } })
      await prisma.project.delete({ where: { id: otherProject.id } })
    })

    it('rejeita quando usuário não é owner ou manager', async () => {
      // Criar usuário sem permissão
      const unauthorizedUser = await prisma.user.create({
        data: {
          name: 'Unauthorized User',
          email: `unauthorized_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      await expect(approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: unauthorizedUser.id
      })).rejects.toThrow(new AppError('Apenas o dono do projeto ou um manager podem aprovar o pacote', 403))

      // Limpar
      await prisma.user.delete({ where: { id: unauthorizedUser.id } })
    })

    it('rejeita quando usuário é apenas tester', async () => {
      // Adicionar tester ao projeto
      await prisma.userOnProject.create({
        data: {
          userId: testerId,
          projectId: projectId,
          role: Role.TESTER
        }
      })

      await expect(approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: testerId
      })).rejects.toThrow(new AppError('Apenas o dono do projeto ou um manager podem aprovar o pacote', 403))
    })

    it('rejeita quando pacote não possui cenários', async () => {
      await expect(approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: ownerId
      })).rejects.toThrow(new AppError('Pacote não possui cenários para aprovar', 400))
    })

    it('rejeita quando nem todos os cenários estão aprovados', async () => {
      // Criar cenários com diferentes status
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          },
          {
            title: 'Scenario 2',
            description: 'Description 2',
            type: ScenarioType.REGRESSION,
            priority: Priority.MEDIUM,
            status: ScenarioStatus.PASSED,
            projectId,
            packageId
          }
        ]
      })

      await expect(approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: ownerId
      })).rejects.toThrow(new AppError('Todos os cenários devem estar aprovados para aprovar o pacote', 400))
    })

    it('rejeita quando pacote já está aprovado', async () => {
      // Criar cenários com status APPROVED
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          }
        ]
      })

      // Aprovar pacote primeira vez
      await approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: ownerId
      })

      // Tentar aprovar novamente
      await expect(approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: ownerId
      })).rejects.toThrow(new AppError('Pacote já está aprovado', 400))
    })

    it('rejeita quando packageId é inválido', async () => {
      await expect(approvePackageUseCase.execute({
        packageId: -1,
        projectId,
        approverId: ownerId
      })).rejects.toThrow()
    })

    it('rejeita quando packageId é zero', async () => {
      await expect(approvePackageUseCase.execute({
        packageId: 0,
        projectId,
        approverId: ownerId
      })).rejects.toThrow()
    })

    it('rejeita quando projectId é inválido', async () => {
      await expect(approvePackageUseCase.execute({
        packageId,
        projectId: -1,
        approverId: ownerId
      })).rejects.toThrow()
    })

    it('rejeita quando approverId é inválido', async () => {
      await expect(approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: -1
      })).rejects.toThrow()
    })
  })

  describe('ApprovePackageUseCase - casos especiais', () => {
    it('funciona com múltiplos cenários todos aprovados', async () => {
      // Criar múltiplos cenários com status APPROVED
      await prisma.testScenario.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          title: `Scenario ${i + 1}`,
          description: `Description ${i + 1}`,
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.APPROVED,
          projectId,
          packageId
        }))
      })

      const result = await approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: ownerId
      })

      expect(result.package.status).toBe(PackageStatus.APROVADO)
      expect(result.package.scenarios).toHaveLength(5)
    })

    it('funciona com cenários de diferentes tipos', async () => {
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Functional Scenario',
            description: 'Description',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          },
          {
            title: 'Regression Scenario',
            description: 'Description',
            type: ScenarioType.REGRESSION,
            priority: Priority.MEDIUM,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          },
          {
            title: 'Smoke Scenario',
            description: 'Description',
            type: ScenarioType.SMOKE,
            priority: Priority.LOW,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          }
        ]
      })

      const result = await approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: ownerId
      })

      expect(result.package.status).toBe(PackageStatus.APROVADO)
      expect(result.package.scenarios).toHaveLength(3)
    })

    it('funciona com cenários que têm testador', async () => {
      // Criar testador
      const testador = await prisma.user.create({
        data: {
          name: 'Testador',
          email: `testador_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      await prisma.testScenario.create({
        data: {
          title: 'Scenario com testador',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.APPROVED,
          projectId,
          packageId,
          testadorId: testador.id
        }
      })

      const result = await approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: ownerId
      })

      expect(result.package.status).toBe(PackageStatus.APROVADO)
      expect(result.package.scenarios[0].testador).toMatchObject({
        id: testador.id,
        name: 'Testador'
      })

      // Limpar
      await prisma.user.delete({ where: { id: testador.id } })
    })

    it('funciona com pacote que está em EM_TESTE', async () => {
      // Atualizar pacote para EM_TESTE
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.EM_TESTE
        }
      })

      // Criar cenários com status APPROVED
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          }
        ]
      })

      const result = await approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: ownerId
      })

      expect(result.package.status).toBe(PackageStatus.APROVADO)
    })
  })

  describe('ApprovePackageUseCase - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      // Criar cenários com status APPROVED
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          }
        ]
      })

      const result = await approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: ownerId
      })

      expect(result).toHaveProperty('package')
      expect(result.package).toHaveProperty('id')
      expect(result.package).toHaveProperty('status')
      expect(result.package).toHaveProperty('approvedById')
      expect(result.package).toHaveProperty('approvedAt')
      expect(result.package).toHaveProperty('approvedBy')
      expect(result.package).toHaveProperty('scenarios')
    })

    it('retorna tipos corretos para propriedades', async () => {
      // Criar cenários com status APPROVED
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          }
        ]
      })

      const result = await approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: ownerId
      })

      expect(typeof result.package.id).toBe('number')
      expect(typeof result.package.status).toBe('string')
      expect(typeof result.package.approvedById).toBe('number')
      expect(result.package.approvedAt).toBeInstanceOf(Date)
      expect(typeof result.package.approvedBy).toBe('object')
      expect(Array.isArray(result.package.scenarios)).toBe(true)
    })
  })

  describe('ApprovePackageUseCase - integração com banco de dados', () => {
    it('atualiza status do pacote no banco de dados', async () => {
      // Criar cenários com status APPROVED
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          }
        ]
      })

      // Verificar status antes da aprovação
      const packageBefore = await prisma.testPackage.findUnique({
        where: { id: packageId }
      })
      expect(packageBefore?.status).toBe(PackageStatus.CREATED)

      await approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: ownerId
      })

      // Verificar status depois da aprovação
      const packageAfter = await prisma.testPackage.findUnique({
        where: { id: packageId }
      })
      expect(packageAfter?.status).toBe(PackageStatus.APROVADO)
      expect(packageAfter?.approvedById).toBe(ownerId)
      expect(packageAfter?.approvedAt).toBeDefined()
    })

    it('salva informação do aprovador', async () => {
      // Criar cenários com status APPROVED
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          }
        ]
      })

      await approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: managerId
      })

      const packageAfter = await prisma.testPackage.findUnique({
        where: { id: packageId },
        include: {
          approvedBy: true
        }
      })

      expect(packageAfter?.approvedById).toBe(managerId)
      expect(packageAfter?.approvedBy).toMatchObject({
        id: managerId,
        name: 'Manager User'
      })
    })

    it('limpa campos de reprovação ao aprovar', async () => {
      // Criar pacote reprovado
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.REPROVADO,
          rejectedById: ownerId,
          rejectedAt: new Date(),
          rejectionReason: 'Motivo anterior'
        }
      })

      // Criar cenários com status APPROVED
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.APPROVED,
            projectId,
            packageId
          }
        ]
      })

      await approvePackageUseCase.execute({
        packageId,
        projectId,
        approverId: ownerId
      })

      const packageAfter = await prisma.testPackage.findUnique({
        where: { id: packageId }
      })

      expect(packageAfter?.status).toBe(PackageStatus.APROVADO)
      expect(packageAfter?.rejectedById).toBeNull()
      expect(packageAfter?.rejectedAt).toBeNull()
      expect(packageAfter?.rejectionReason).toBeNull()
    })
  })
})

