import 'dotenv/config'
import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'

const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

describe('createScenarioInPackage.controller', () => {
  beforeEach(async () => {
    await prisma.$transaction([
      prisma.testScenarioStep.deleteMany(),
      prisma.testScenario.deleteMany(),
      prisma.testPackage.deleteMany(),
      prisma.userOnProject.deleteMany(),
      prisma.project.deleteMany(),
      prisma.user.deleteMany()
    ])
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('createScenarioInPackageController function', () => {
    it('deve criar cenário no pacote com sucesso', async () => {
      const { createScenarioInPackageController } = require('../../../controllers/scenarios/createScenarioInPackage.controller')
      
      // Criar usuário e projeto
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: unique('test') + '@example.com',
          password: 'secret'
        }
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: user.id
        }
      })

      // Criar pacote
      const testPackage = await prisma.testPackage.create({
        data: {
          title: 'Test Package',
          description: 'Test Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId: project.id,
          release: '1.0.0'
        }
      })

      const req = {
        params: { 
          packageId: testPackage.id.toString(), 
          projectId: project.id.toString() 
        },
        body: {
          title: 'Test Scenario',
          description: 'Test Description',
          priority: 'HIGH',
          steps: [
            { action: 'Step 1', expected: 'Expected 1' },
            { action: 'Step 2', expected: 'Expected 2' }
          ]
        },
        user: { id: user.id }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await createScenarioInPackageController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cenário criado com sucesso no pacote',
          scenario: expect.objectContaining({
            title: 'Test Scenario',
            description: 'Test Description',
            priority: 'HIGH'
          })
        })
      )
    })

    it('deve criar cenário com campos opcionais', async () => {
      const { createScenarioInPackageController } = require('../../../controllers/scenarios/createScenarioInPackage.controller')
      
      // Criar usuário e projeto
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: unique('test') + '@example.com',
          password: 'secret'
        }
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: user.id
        }
      })

      // Criar pacote
      const testPackage = await prisma.testPackage.create({
        data: {
          title: 'Test Package',
          description: 'Test Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId: project.id,
          release: '1.0.0'
        }
      })

      const req = {
        params: { 
          packageId: testPackage.id.toString(), 
          projectId: project.id.toString() 
        },
        body: {
          title: 'Test Scenario Optional',
          priority: 'MEDIUM',
          tags: ['tag1', 'tag2'],
          environment: 'DEV',
          assigneeId: user.id
        },
        user: { id: user.id }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await createScenarioInPackageController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cenário criado com sucesso no pacote'
        })
      )
    })

    it('deve tratar assigneeEmail como objeto com propriedade value', async () => {
      const { createScenarioInPackageController } = require('../../../controllers/scenarios/createScenarioInPackage.controller')
      
      // Criar usuário e projeto
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: unique('test') + '@example.com',
          password: 'secret'
        }
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: user.id
        }
      })

      // Criar pacote
      const testPackage = await prisma.testPackage.create({
        data: {
          title: 'Test Package',
          description: 'Test Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId: project.id,
          release: '1.0.0'
        }
      })

      // Criar usuário para o email
      const assignee = await prisma.user.create({
        data: {
          name: 'Assignee User',
          email: 'test@example.com',
          password: 'secret'
        }
      })

      const req = {
        params: { 
          packageId: testPackage.id.toString(), 
          projectId: project.id.toString() 
        },
        body: {
          title: 'Test Scenario Email',
          priority: 'HIGH',
          assigneeEmail: { value: 'test@example.com' }
        },
        user: { id: user.id }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await createScenarioInPackageController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(201)
      
      // Limpar o assignee criado
      await prisma.user.delete({ where: { id: assignee.id } })
    })

    it('deve tratar assigneeEmail como objeto com propriedade email', async () => {
      const { createScenarioInPackageController } = require('../../../controllers/scenarios/createScenarioInPackage.controller')
      
      // Criar usuário e projeto
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: unique('test') + '@example.com',
          password: 'secret'
        }
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: user.id
        }
      })

      // Criar pacote
      const testPackage = await prisma.testPackage.create({
        data: {
          title: 'Test Package',
          description: 'Test Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId: project.id,
          release: '1.0.0'
        }
      })

      // Criar usuário para o email
      const assignee = await prisma.user.create({
        data: {
          name: 'Assignee User 2',
          email: 'test2@example.com',
          password: 'secret'
        }
      })

      const req = {
        params: { 
          packageId: testPackage.id.toString(), 
          projectId: project.id.toString() 
        },
        body: {
          title: 'Test Scenario Email 2',
          priority: 'HIGH',
          assigneeEmail: { email: 'test2@example.com' }
        },
        user: { id: user.id }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await createScenarioInPackageController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(201)
      
      // Limpar o assignee criado
      await prisma.user.delete({ where: { id: assignee.id } })
    })

    it('deve tratar assigneeEmail como objeto null', async () => {
      const { createScenarioInPackageController } = require('../../../controllers/scenarios/createScenarioInPackage.controller')
      
      // Criar usuário e projeto
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: unique('test') + '@example.com',
          password: 'secret'
        }
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: user.id
        }
      })

      // Criar pacote
      const testPackage = await prisma.testPackage.create({
        data: {
          title: 'Test Package',
          description: 'Test Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId: project.id,
          release: '1.0.0'
        }
      })

      const req = {
        params: { 
          packageId: testPackage.id.toString(), 
          projectId: project.id.toString() 
        },
        body: {
          title: 'Test Scenario Email Null',
          priority: 'HIGH',
          assigneeEmail: null
        },
        user: { id: user.id }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await createScenarioInPackageController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('deve rejeitar quando title está ausente', async () => {
      const { createScenarioInPackageController } = require('../../../controllers/scenarios/createScenarioInPackage.controller')
      
      const req = {
        params: { packageId: '1', projectId: '1' },
        body: {
          priority: 'HIGH'
        },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await createScenarioInPackageController(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Campos obrigatórios: title, priority',
          statusCode: 400
        })
      )
    })

    it('deve rejeitar quando priority está ausente', async () => {
      const { createScenarioInPackageController } = require('../../../controllers/scenarios/createScenarioInPackage.controller')
      
      const req = {
        params: { packageId: '1', projectId: '1' },
        body: {
          title: 'Test Scenario'
        },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await createScenarioInPackageController(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Campos obrigatórios: title, priority',
          statusCode: 400
        })
      )
    })

    it('deve rejeitar quando title está vazio', async () => {
      const { createScenarioInPackageController } = require('../../../controllers/scenarios/createScenarioInPackage.controller')
      
      const req = {
        params: { packageId: '1', projectId: '1' },
        body: {
          title: '',
          priority: 'HIGH'
        },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await createScenarioInPackageController(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Campos obrigatórios: title, priority',
          statusCode: 400
        })
      )
    })

    it('deve rejeitar quando priority está vazio', async () => {
      const { createScenarioInPackageController } = require('../../../controllers/scenarios/createScenarioInPackage.controller')
      
      const req = {
        params: { packageId: '1', projectId: '1' },
        body: {
          title: 'Test Scenario',
          priority: ''
        },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await createScenarioInPackageController(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Campos obrigatórios: title, priority',
          statusCode: 400
        })
      )
    })

    it('deve rejeitar quando packageId é inválido', async () => {
      const { createScenarioInPackageController } = require('../../../controllers/scenarios/createScenarioInPackage.controller')
      
      const req = {
        params: { packageId: 'invalid', projectId: '1' },
        body: {
          title: 'Test Scenario',
          priority: 'HIGH'
        },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await createScenarioInPackageController(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'IDs inválidos',
          statusCode: 400
        })
      )
    })

    it('deve rejeitar quando projectId é inválido', async () => {
      const { createScenarioInPackageController } = require('../../../controllers/scenarios/createScenarioInPackage.controller')
      
      const req = {
        params: { packageId: '1', projectId: 'invalid' },
        body: {
          title: 'Test Scenario',
          priority: 'HIGH'
        },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await createScenarioInPackageController(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'IDs inválidos',
          statusCode: 400
        })
      )
    })

    it('deve rejeitar quando ambos IDs são inválidos', async () => {
      const { createScenarioInPackageController } = require('../../../controllers/scenarios/createScenarioInPackage.controller')
      
      const req = {
        params: { packageId: 'invalid', projectId: 'invalid' },
        body: {
          title: 'Test Scenario',
          priority: 'HIGH'
        },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await createScenarioInPackageController(req, res, next)

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'IDs inválidos',
          statusCode: 400
        })
      )
    })

    it('deve processar testadorId e aprovadorId corretamente', async () => {
      const { createScenarioInPackageController } = require('../../../controllers/scenarios/createScenarioInPackage.controller')
      
      // Criar usuário e projeto
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: unique('test') + '@example.com',
          password: 'secret'
        }
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: user.id
        }
      })

      // Criar usuários para testador e aprovador
      const testador = await prisma.user.create({
        data: {
          name: 'Testador User',
          email: unique('testador') + '@example.com',
          password: 'secret'
        }
      })

      const aprovador = await prisma.user.create({
        data: {
          name: 'Aprovador User',
          email: unique('aprovador') + '@example.com',
          password: 'secret'
        }
      })

      // Adicionar usuários como membros do projeto
      await prisma.userOnProject.create({
        data: {
          userId: testador.id,
          projectId: project.id,
          role: 'TESTER'
        }
      })

      await prisma.userOnProject.create({
        data: {
          userId: aprovador.id,
          projectId: project.id,
          role: 'APPROVER'
        }
      })

      // Criar pacote
      const testPackage = await prisma.testPackage.create({
        data: {
          title: 'Test Package',
          description: 'Test Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId: project.id,
          release: '1.0.0'
        }
      })

      const req = {
        params: { 
          packageId: testPackage.id.toString(), 
          projectId: project.id.toString() 
        },
        body: {
          title: 'Test Scenario with IDs',
          priority: 'HIGH',
          testadorId: testador.id.toString(),
          aprovadorId: aprovador.id.toString()
        },
        user: { id: user.id }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await createScenarioInPackageController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(201)
      
      // Limpar os usuários criados
      await prisma.user.delete({ where: { id: testador.id } })
      await prisma.user.delete({ where: { id: aprovador.id } })
    })

    it('deve funcionar sem autenticação (modo debug)', async () => {
      const { createScenarioInPackageController } = require('../../../controllers/scenarios/createScenarioInPackage.controller')
      
      // Criar usuário e projeto
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: unique('test') + '@example.com',
          password: 'secret'
        }
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          ownerId: user.id
        }
      })

      // Criar pacote
      const testPackage = await prisma.testPackage.create({
        data: {
          title: 'Test Package',
          description: 'Test Description',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          projectId: project.id,
          release: '1.0.0'
        }
      })

      const req = {
        params: { 
          packageId: testPackage.id.toString(), 
          projectId: project.id.toString() 
        },
        body: {
          title: 'Test Scenario No Auth',
          priority: 'HIGH'
        },
        user: undefined // Sem autenticação
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await createScenarioInPackageController(req, res, next)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('deve tratar erros do use case corretamente', async () => {
      const { createScenarioInPackageController } = require('../../../controllers/scenarios/createScenarioInPackage.controller')
      
      const req = {
        params: { packageId: '999', projectId: '999' },
        body: {
          title: 'Test Scenario Error',
          priority: 'HIGH'
        },
        user: { id: 1 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await createScenarioInPackageController(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })
  })
})
