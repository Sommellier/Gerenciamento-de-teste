import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Configurar USE_MOCK = true via variável de ambiente
process.env.USE_MOCK = 'true'

// Mock do api
vi.mock('src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

// Importar o módulo após configurar USE_MOCK
// Para realmente cobrir as linhas 149-177, 198-210, 238-240, e 263-265,
// precisamos executar o código real quando USE_MOCK é true.
describe('project-details.service (USE_MOCK mode)', () => {
  let getProjectDetails: any
  let createTestPackage: any
  let getProjectMembers: any
  let getAvailableReleases: any

  beforeEach(async () => {
    vi.resetModules()
    
    // Configurar USE_MOCK = true via variável de ambiente
    process.env.USE_MOCK = 'true'
    
    // Reimportar o módulo com USE_MOCK = true
    const module = await import('src/services/project-details.service')
    getProjectDetails = module.getProjectDetails
    createTestPackage = module.createTestPackage
    getProjectMembers = module.getProjectMembers
    getAvailableReleases = module.getAvailableReleases
  })

  afterEach(() => {
    vi.resetModules()
    delete process.env.USE_MOCK
  })

  it('deve usar dados mock quando USE_MOCK é true em getProjectDetails sem release (linhas 149-177)', async () => {
    const result = await getProjectDetails(1)

    expect(result.id).toBe(1)
    expect(result.name).toBe('Projeto 1')
    expect(result.members).toBeDefined()
    expect(result.testPackages).toBeDefined()
    expect(result.metrics).toBeDefined()
    expect(result.scenarios).toBeDefined()
    expect(result.scenarioMetrics).toBeDefined()
  })

  it('deve usar dados mock quando USE_MOCK é true em getProjectDetails com release (linhas 149-177)', async () => {
    const result = await getProjectDetails(1, '2024-09')

    expect(result.id).toBe(1)
    expect(result.name).toBe('Projeto 1')
    expect(result.members).toBeDefined()
    expect(result.testPackages).toBeDefined()
    expect(result.metrics).toBeDefined()
  })

  it('deve usar dados mock quando USE_MOCK é true em createTestPackage (linhas 198-210)', async () => {
    const newPackage = {
      title: 'Novo Pacote Mock',
      description: 'Descrição do pacote mock',
      type: 'Functional',
      priority: 'High',
      tags: ['test'],
      steps: [
        { id: 1, action: 'Ação 1', expected: 'Resultado 1' },
      ],
      release: '2024-09',
    }

    const result = await createTestPackage(1, newPackage)

    expect(result.title).toBe('Novo Pacote Mock')
    expect(result.status).toBe('Created')
    expect(result.id).toBeDefined()
    expect(result.createdAt).toBeDefined()
    expect(result.updatedAt).toBeDefined()
  })

  it('deve usar dados mock quando USE_MOCK é true em getProjectMembers (linhas 238-240)', async () => {
    const result = await getProjectMembers(1)

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('name')
    expect(result[0]).toHaveProperty('email')
    expect(result[0]).toHaveProperty('role')
  })

  it('deve usar dados mock quando USE_MOCK é true em getAvailableReleases (linhas 263-265)', async () => {
    const result = await getAvailableReleases(1)

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })
})

