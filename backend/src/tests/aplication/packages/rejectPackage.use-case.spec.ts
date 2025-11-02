import { prisma } from '../../../infrastructure/prisma'
import { RejectPackageUseCase } from '../../../application/use-cases/packages/rejectPackage.use-case'
import { AppError } from '../../../utils/AppError'
import { Role, ScenarioType, Priority, ScenarioStatus, PackageStatus } from '@prisma/client'
import * as emailUtil from '../../../utils/email.util'

// Mock do email.util
jest.mock('../../../utils/email.util', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined)
}))

describe('RejectPackageUseCase', () => {
  let projectId: number
  let packageId: number
  let ownerId: number
  let managerId: number
  let testerId: number
  let rejectorId: number
  const rejectPackageUseCase = new RejectPackageUseCase()

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

    // Criar usuário rejector (será manager)
    rejectorId = managerId

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

    // Criar pacote em EM_TESTE
    const testPackage = await prisma.testPackage.create({
      data: {
        title: 'Test Package',
        description: 'Test Package Description',
        type: ScenarioType.FUNCTIONAL,
        priority: Priority.HIGH,
        release: '2024-01',
        status: PackageStatus.EM_TESTE,
        projectId: projectId
      }
    })
    packageId = testPackage.id

    // Limpar mocks
    jest.clearAllMocks()
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

  describe('RejectPackageUseCase - casos de sucesso', () => {
    it('reprova pacote quando está em EM_TESTE', async () => {
      const rejectionReason = 'Cenários não atendem aos requisitos'

      const result = await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason
      })

      expect(result.package).toMatchObject({
        id: packageId,
        status: PackageStatus.REPROVADO,
        rejectedById: ownerId,
        rejectionReason
      })
      expect(result.package.rejectedBy).toMatchObject({
        id: ownerId,
        name: 'Owner User'
      })
      expect(result.package.rejectedAt).toBeDefined()
      expect(result.package.approvedById).toBeNull()
      expect(result.package.approvedAt).toBeNull()
    })

    it('reprova pacote quando manager reprova', async () => {
      const rejectionReason = 'Testes insuficientes'

      const result = await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: managerId,
        rejectionReason
      })

      expect(result.package.status).toBe(PackageStatus.REPROVADO)
      expect(result.package.rejectedById).toBe(managerId)
      expect(result.package.rejectedBy).toMatchObject({
        id: managerId,
        name: 'Manager User'
      })
    })

    it('limpa campos de aprovação quando reprova', async () => {
      // Criar pacote aprovado anteriormente
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.APROVADO,
          approvedById: ownerId,
          approvedAt: new Date()
        }
      })

      // Atualizar para EM_TESTE para poder reprovar
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.EM_TESTE
        }
      })

      const rejectionReason = 'Necessita revisão'

      const result = await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason
      })

      expect(result.package.status).toBe(PackageStatus.REPROVADO)
      expect(result.package.approvedById).toBeNull()
      expect(result.package.approvedAt).toBeNull()
    })

    it('envia e-mail para testador do pacote quando há assigneeEmail', async () => {
      // Atualizar pacote com assigneeEmail
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          assigneeEmail: 'tester@example.com'
        }
      })

      const rejectionReason = 'Testes incompletos'

      await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason
      })

      expect(emailUtil.sendEmail).toHaveBeenCalledWith(
        'tester@example.com',
        expect.stringContaining('Pacote de Testes Reproado'),
        expect.stringContaining('Test Package')
      )
    })

    it('envia e-mail para testador dos cenários', async () => {
      // Criar testador
      const testador = await prisma.user.create({
        data: {
          name: 'Testador',
          email: `testador_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      // Criar cenário com testador
      await prisma.testScenario.create({
        data: {
          title: 'Scenario com testador',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId,
          packageId,
          testadorId: testador.id
        }
      })

      const rejectionReason = 'Cenários não aprovados'

      await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason
      })

      expect(emailUtil.sendEmail).toHaveBeenCalledWith(
        testador.email,
        expect.stringContaining('Pacote de Testes Reproado'),
        expect.stringContaining('Test Package')
      )

      // Limpar
      await prisma.user.delete({ where: { id: testador.id } })
    })

    it('envia e-mail para múltiplos testadores', async () => {
      // Criar múltiplos testadores
      const testador1 = await prisma.user.create({
        data: {
          name: 'Testador 1',
          email: `testador1_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      const testador2 = await prisma.user.create({
        data: {
          name: 'Testador 2',
          email: `testador2_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      // Criar cenários com diferentes testadores
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.CREATED,
            projectId,
            packageId,
            testadorId: testador1.id
          },
          {
            title: 'Scenario 2',
            description: 'Description 2',
            type: ScenarioType.REGRESSION,
            priority: Priority.MEDIUM,
            status: ScenarioStatus.CREATED,
            projectId,
            packageId,
            testadorId: testador2.id
          }
        ]
      })

      const rejectionReason = 'Cenários precisam de revisão'

      await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason
      })

      expect(emailUtil.sendEmail).toHaveBeenCalledTimes(2)
      expect(emailUtil.sendEmail).toHaveBeenCalledWith(
        testador1.email,
        expect.stringContaining('Pacote de Testes Reproado'),
        expect.any(String)
      )
      expect(emailUtil.sendEmail).toHaveBeenCalledWith(
        testador2.email,
        expect.stringContaining('Pacote de Testes Reproado'),
        expect.any(String)
      )

      // Limpar
      await prisma.user.deleteMany({ where: { id: { in: [testador1.id, testador2.id] } } })
    })

    it('inclui motivo da reprovação no e-mail', async () => {
      const testador = await prisma.user.create({
        data: {
          name: 'Testador',
          email: `testador_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      await prisma.testScenario.create({
        data: {
          title: 'Scenario',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId,
          packageId,
          testadorId: testador.id
        }
      })

      const rejectionReason = 'Motivo específico da reprovação'

      await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason
      })

      expect(emailUtil.sendEmail).toHaveBeenCalledWith(
        testador.email,
        expect.any(String),
        expect.stringContaining(rejectionReason)
      )

      // Limpar
      await prisma.user.delete({ where: { id: testador.id } })
    })

    it('continua mesmo se envio de e-mail falhar', async () => {
      // Mock para simular falha no envio de e-mail
      ;(emailUtil.sendEmail as jest.Mock).mockRejectedValueOnce(new Error('Erro ao enviar e-mail'))

      const testador = await prisma.user.create({
        data: {
          name: 'Testador',
          email: `testador_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      await prisma.testScenario.create({
        data: {
          title: 'Scenario',
          description: 'Description',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId,
          packageId,
          testadorId: testador.id
        }
      })

      const rejectionReason = 'Motivo da reprovação'

      const result = await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason
      })

      // Deve ter sucesso mesmo com falha no e-mail
      expect(result.package.status).toBe(PackageStatus.REPROVADO)

      // Limpar
      await prisma.user.delete({ where: { id: testador.id } })
    })

    it('inclui cenários no retorno', async () => {
      const scenario = await prisma.testScenario.create({
        data: {
          title: 'Scenario 1',
          description: 'Description 1',
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId,
          packageId
        }
      })

      const result = await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason: 'Motivo'
      })

      expect(result.package.scenarios).toHaveLength(1)
      expect(result.package.scenarios[0]).toMatchObject({
        id: scenario.id,
        title: 'Scenario 1'
      })
    })
  })

  describe('RejectPackageUseCase - casos de erro', () => {
    it('rejeita quando pacote não existe', async () => {
      await expect(rejectPackageUseCase.execute({
        packageId: 99999,
        projectId,
        rejectorId: ownerId,
        rejectionReason: 'Motivo'
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
          status: PackageStatus.EM_TESTE,
          projectId: otherProject.id
        }
      })

      await expect(rejectPackageUseCase.execute({
        packageId: otherPackage.id,
        projectId,
        rejectorId: ownerId,
        rejectionReason: 'Motivo'
      })).rejects.toThrow(new AppError('Pacote não encontrado', 404))

      // Limpar
      await prisma.testPackage.delete({ where: { id: otherPackage.id } })
      await prisma.project.delete({ where: { id: otherProject.id } })
    })

    it('rejeita quando pacote não está em EM_TESTE', async () => {
      // Atualizar pacote para outro status
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.CREATED
        }
      })

      await expect(rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason: 'Motivo'
      })).rejects.toThrow(new AppError('Pacote deve estar em EM_TESTE para ser reprovado', 400))
    })

    it('rejeita quando pacote está em APROVADO', async () => {
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.APROVADO
        }
      })

      await expect(rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason: 'Motivo'
      })).rejects.toThrow(new AppError('Pacote deve estar em EM_TESTE para ser reprovado', 400))
    })

    // Nota: rejectionReason vazio não é validado no use-case (é validado no controller)
    // Então não há necessidade de testar aqui

    it('rejeita quando packageId é inválido', async () => {
      await expect(rejectPackageUseCase.execute({
        packageId: -1,
        projectId,
        rejectorId: ownerId,
        rejectionReason: 'Motivo'
      })).rejects.toThrow()
    })

    it('rejeita quando packageId é zero', async () => {
      await expect(rejectPackageUseCase.execute({
        packageId: 0,
        projectId,
        rejectorId: ownerId,
        rejectionReason: 'Motivo'
      })).rejects.toThrow()
    })

    it('rejeita quando projectId é inválido', async () => {
      await expect(rejectPackageUseCase.execute({
        packageId,
        projectId: -1,
        rejectorId: ownerId,
        rejectionReason: 'Motivo'
      })).rejects.toThrow()
    })

    it('rejeita quando rejectorId é inválido', async () => {
      await expect(rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: -1,
        rejectionReason: 'Motivo'
      })).rejects.toThrow()
    })
  })

  describe('RejectPackageUseCase - casos especiais', () => {
    it('funciona com múltiplos cenários', async () => {
      await prisma.testScenario.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          title: `Scenario ${i + 1}`,
          description: `Description ${i + 1}`,
          type: ScenarioType.FUNCTIONAL,
          priority: Priority.HIGH,
          status: ScenarioStatus.CREATED,
          projectId,
          packageId
        }))
      })

      const result = await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason: 'Múltiplos cenários com problemas'
      })

      expect(result.package.status).toBe(PackageStatus.REPROVADO)
      expect(result.package.scenarios).toHaveLength(5)
    })

    it('funciona com pacote sem assigneeEmail e sem testadores', async () => {
      const result = await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason: 'Motivo'
      })

      expect(result.package.status).toBe(PackageStatus.REPROVADO)
      // Não deve chamar sendEmail se não há testadores
      expect(emailUtil.sendEmail).not.toHaveBeenCalled()
    })

    it('funciona com motivo de reprovação longo', async () => {
      const longReason = 'A'.repeat(1000)

      const result = await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason: longReason
      })

      expect(result.package.status).toBe(PackageStatus.REPROVADO)
      expect(result.package.rejectionReason).toBe(longReason)
    })

    it('não envia e-mail duplicado para mesmo testador', async () => {
      const testador = await prisma.user.create({
        data: {
          name: 'Testador',
          email: `testador_${Date.now()}@example.com`,
          password: 'password123'
        }
      })

      // Criar múltiplos cenários com mesmo testador
      await prisma.testScenario.createMany({
        data: [
          {
            title: 'Scenario 1',
            description: 'Description 1',
            type: ScenarioType.FUNCTIONAL,
            priority: Priority.HIGH,
            status: ScenarioStatus.CREATED,
            projectId,
            packageId,
            testadorId: testador.id
          },
          {
            title: 'Scenario 2',
            description: 'Description 2',
            type: ScenarioType.REGRESSION,
            priority: Priority.MEDIUM,
            status: ScenarioStatus.CREATED,
            projectId,
            packageId,
            testadorId: testador.id
          }
        ]
      })

      await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason: 'Motivo'
      })

      // Deve enviar apenas um e-mail para o testador
      expect(emailUtil.sendEmail).toHaveBeenCalledTimes(1)
      expect(emailUtil.sendEmail).toHaveBeenCalledWith(
        testador.email,
        expect.any(String),
        expect.any(String)
      )

      // Limpar
      await prisma.user.delete({ where: { id: testador.id } })
    })
  })

  describe('RejectPackageUseCase - validação de tipos de retorno', () => {
    it('retorna objeto com propriedades corretas', async () => {
      const result = await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason: 'Motivo'
      })

      expect(result).toHaveProperty('package')
      expect(result.package).toHaveProperty('id')
      expect(result.package).toHaveProperty('status')
      expect(result.package).toHaveProperty('rejectedById')
      expect(result.package).toHaveProperty('rejectedAt')
      expect(result.package).toHaveProperty('rejectionReason')
      expect(result.package).toHaveProperty('rejectedBy')
      expect(result.package).toHaveProperty('scenarios')
    })

    it('retorna tipos corretos para propriedades', async () => {
      const result = await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason: 'Motivo'
      })

      expect(typeof result.package.id).toBe('number')
      expect(typeof result.package.status).toBe('string')
      expect(typeof result.package.rejectedById).toBe('number')
      expect(result.package.rejectedAt).toBeInstanceOf(Date)
      expect(typeof result.package.rejectionReason).toBe('string')
      expect(typeof result.package.rejectedBy).toBe('object')
      expect(Array.isArray(result.package.scenarios)).toBe(true)
    })
  })

  describe('RejectPackageUseCase - integração com banco de dados', () => {
    it('atualiza status do pacote no banco de dados', async () => {
      // Verificar status antes da reprovação
      const packageBefore = await prisma.testPackage.findUnique({
        where: { id: packageId }
      })
      expect(packageBefore?.status).toBe(PackageStatus.EM_TESTE)

      await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason: 'Motivo'
      })

      // Verificar status depois da reprovação
      const packageAfter = await prisma.testPackage.findUnique({
        where: { id: packageId }
      })
      expect(packageAfter?.status).toBe(PackageStatus.REPROVADO)
      expect(packageAfter?.rejectedById).toBe(ownerId)
      expect(packageAfter?.rejectedAt).toBeDefined()
      expect(packageAfter?.rejectionReason).toBe('Motivo')
    })

    it('salva informação do reprovador', async () => {
      await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: managerId,
        rejectionReason: 'Motivo'
      })

      const packageAfter = await prisma.testPackage.findUnique({
        where: { id: packageId },
        include: {
          rejectedBy: true
        }
      })

      expect(packageAfter?.rejectedById).toBe(managerId)
      expect(packageAfter?.rejectedBy).toMatchObject({
        id: managerId,
        name: 'Manager User'
      })
    })

    it('limpa campos de aprovação ao reprovar', async () => {
      // Criar pacote aprovado anteriormente
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.APROVADO,
          approvedById: ownerId,
          approvedAt: new Date()
        }
      })

      // Atualizar para EM_TESTE
      await prisma.testPackage.update({
        where: { id: packageId },
        data: {
          status: PackageStatus.EM_TESTE
        }
      })

      await rejectPackageUseCase.execute({
        packageId,
        projectId,
        rejectorId: ownerId,
        rejectionReason: 'Motivo'
      })

      const packageAfter = await prisma.testPackage.findUnique({
        where: { id: packageId }
      })

      expect(packageAfter?.status).toBe(PackageStatus.REPROVADO)
      expect(packageAfter?.approvedById).toBeNull()
      expect(packageAfter?.approvedAt).toBeNull()
    })
  })
})

