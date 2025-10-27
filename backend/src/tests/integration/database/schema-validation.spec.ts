import { prisma } from '../../../infrastructure/prisma'

describe('Database Schema Validation', () => {
  it('deve ter o campo packageId no modelo TestScenario', async () => {
    // Verificar se o campo packageId existe na tabela TestScenario
    const tableInfo = await prisma.$queryRaw`
      PRAGMA table_info(TestScenario);
    `
    
    const packageIdField = (tableInfo as any[]).find(field => field.name === 'packageId')
    expect(packageIdField).toBeDefined()
    expect(packageIdField.name).toBe('packageId')
  })

  it('deve permitir criar cenário com packageId', async () => {
    // Criar dados de teste
    const owner = await prisma.user.create({
      data: {
        name: 'Test Owner',
        email: `test-owner-${Date.now()}@test.com`,
        password: 'password123'
      }
    })

    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: owner.id
      }
    })

    const testPackage = await prisma.testPackage.create({
      data: {
        title: 'Test Package',
        description: 'Test Package Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId: project.id,
        release: '2024-01'
      }
    })

    // Criar cenário com packageId
    const scenario = await prisma.testScenario.create({
      data: {
        title: 'Test Scenario',
        description: 'Test Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId: project.id,
        packageId: testPackage.id,
        steps: {
          create: [
            { action: 'Step 1', expected: 'Expected 1', stepOrder: 1 }
          ]
        }
      }
    })

    expect(scenario.projectId).toBe(project.id)
    expect(scenario.packageId).toBe(testPackage.id)

    // Limpar dados de teste
    await prisma.testScenarioStep.deleteMany({
      where: { scenarioId: scenario.id }
    })
    await prisma.testScenario.delete({
      where: { id: scenario.id }
    })
    await prisma.testPackage.delete({
      where: { id: testPackage.id }
    })
    await prisma.project.delete({
      where: { id: project.id }
    })
    await prisma.user.delete({
      where: { id: owner.id }
    })
  })

  it('deve permitir criar cenário sem packageId (cenário independente)', async () => {
    // Criar dados de teste
    const owner = await prisma.user.create({
      data: {
        name: 'Test Owner',
        email: `test-owner-${Date.now()}@test.com`,
        password: 'password123'
      }
    })

    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: owner.id
      }
    })

    // Criar cenário sem packageId (independente)
    const scenario = await prisma.testScenario.create({
      data: {
        title: 'Independent Scenario',
        description: 'Test Description',
        type: 'FUNCTIONAL',
        priority: 'HIGH',
        projectId: project.id,
        steps: {
          create: [
            { action: 'Step 1', expected: 'Expected 1', stepOrder: 1 }
          ]
        }
      }
    })

    expect(scenario.projectId).toBe(project.id)
    expect(scenario.packageId).toBeNull()

    // Limpar dados de teste
    await prisma.testScenarioStep.deleteMany({
      where: { scenarioId: scenario.id }
    })
    await prisma.testScenario.delete({
      where: { id: scenario.id }
    })
    await prisma.project.delete({
      where: { id: project.id }
    })
    await prisma.user.delete({
      where: { id: owner.id }
    })
  })
})
