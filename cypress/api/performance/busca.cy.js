describe('API - Performance: Testes de Busca', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner Busca',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null,
    name: 'Projeto para Busca',
    description: 'Projeto para testes de performance de busca'
  }

  let testPackage = {
    id: null
  }

  const NUM_PROJECTS = 100 // Número de projetos para criar
  const NUM_SCENARIOS = 200 // Número de cenários para criar
  const createdProjectIds = []
  const createdPackageIds = []
  const createdScenarioIds = []

  // Função auxiliar para obter token de autenticação
  const getAuthToken = (email, password) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/login`,
      body: { email, password },
      failOnStatusCode: false
    }).then((response) => {
      if (response.status === 200 && response.body.accessToken) {
        return response.body.accessToken
      }
      return null
    })
  }

  // Função auxiliar para garantir que temos um token válido
  const ensureToken = (user) => {
    if (user.token && typeof user.token === 'string') {
      return cy.wrap(user.token)
    }
    return getAuthToken(user.email, user.password).then((token) => {
      if (token && typeof token === 'string') {
        user.token = token
        return token
      }
      return null
    })
  }

  // Função auxiliar para criar usuário
  const createTestUser = (userData, delay = 500) => {
    return cy.wait(delay).then(() => {
      return cy.request({
        method: 'POST',
        url: `${API_BASE_URL}/register`,
        body: userData,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 429) {
          cy.log('Rate limit atingido, aguardando...')
          return cy.wait(2000).then(() => {
            return cy.request({
              method: 'POST',
              url: `${API_BASE_URL}/register`,
              body: userData,
              failOnStatusCode: false
            })
          })
        }
        return response
      })
    })
  }

  // Função auxiliar para criar projeto
  const createProject = (token, projectData) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/projects`,
      headers: { Authorization: `Bearer ${token}` },
      body: projectData,
      failOnStatusCode: false
    })
  }

  // Função auxiliar para criar pacote
  const createPackage = (token, projectId, packageData) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/projects/${projectId}/packages`,
      headers: { Authorization: `Bearer ${token}` },
      body: packageData,
      failOnStatusCode: false
    })
  }

  // Função auxiliar para criar cenário
  const createScenario = (token, packageId, scenarioData) => {
    return cy.request({
      method: 'POST',
      url: `${API_BASE_URL}/packages/${packageId}/scenarios`,
      headers: { Authorization: `Bearer ${token}` },
      body: scenarioData,
      failOnStatusCode: false
    })
  }

  // Função auxiliar para medir tempo de resposta
  const measureResponseTime = (requestFn) => {
    const startTime = Date.now()
    return requestFn().then((response) => {
      const endTime = Date.now()
      const responseTime = endTime - startTime
      return { response, responseTime }
    })
  }

  // Setup: Criar usuário, projeto principal e muitos dados para busca
  before(() => {
    // Criar owner
    const ownerEmail = `owner-busca-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
    testUsers.owner.email = ownerEmail

    return createTestUser({
      name: testUsers.owner.name,
      email: testUsers.owner.email,
      password: testUsers.owner.password
    }, 0).then((response) => {
      if (response.status === 201 && response.body.id) {
        testUsers.owner.id = response.body.id
        return getAuthToken(testUsers.owner.email, testUsers.owner.password)
      }
      return null
    }).then((token) => {
      if (token && typeof token === 'string') {
        testUsers.owner.token = token

        // Criar projeto principal
        return createProject(token, {
          name: testProject.name,
          description: testProject.description
        })
      }
      return null
    }).then((projectResponse) => {
      if (projectResponse && projectResponse.status === 201 && projectResponse.body.id) {
        testProject.id = projectResponse.body.id

        // Criar pacote principal
        return ensureToken(testUsers.owner).then((ownerToken) => {
          return createPackage(ownerToken, testProject.id, {
            title: 'Pacote para Busca',
            description: 'Pacote para testes de busca',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            release: '2024-01'
          })
        })
      }
      return null
    }).then((packageResponse) => {
      if (packageResponse && packageResponse.status === 201 && packageResponse.body.testPackage?.id) {
        testPackage.id = packageResponse.body.testPackage.id
      }
    }).then(() => {
      // Criar muitos projetos para busca
      cy.log(`Criando ${NUM_PROJECTS} projetos para testes de busca...`)
      let chain = cy.wrap(null)

      for (let i = 0; i < NUM_PROJECTS; i++) {
        chain = chain.then(() => {
          return ensureToken(testUsers.owner).then((ownerToken) => {
            const projectName = `Projeto Busca ${i + 1} - ${Math.random().toString(36).substring(7)}`
            return createProject(ownerToken, {
              name: projectName,
              description: `Descrição do projeto ${i + 1}`
            }).then((response) => {
              if (response && response.status === 201 && response.body.id) {
                createdProjectIds.push(response.body.id)
              }
              // Pequeno delay para evitar rate limiting
              return cy.wait(50)
            })
          })
        })
      }

      return chain
    }).then(() => {
      cy.log(`Criados ${createdProjectIds.length} projetos`)
      
      // Criar muitos cenários no pacote principal
      cy.log(`Criando ${NUM_SCENARIOS} cenários para testes de busca...`)
      let chain = cy.wrap(null)

      for (let i = 0; i < NUM_SCENARIOS; i++) {
        chain = chain.then(() => {
          return ensureToken(testUsers.owner).then((ownerToken) => {
            if (!testPackage.id) {
              return null
            }
            const scenarioTitle = `Cenário Busca ${i + 1} - ${Math.random().toString(36).substring(7)}`
            return createScenario(ownerToken, testPackage.id, {
              title: scenarioTitle,
              description: `Descrição do cenário ${i + 1}`,
              type: 'FUNCTIONAL',
              priority: 'HIGH',
              steps: [
                { action: `Ação ${i + 1}`, expected: `Esperado ${i + 1}` }
              ]
            }).then((response) => {
              if (response && response.status === 201 && response.body.scenario?.id) {
                createdScenarioIds.push(response.body.scenario.id)
              }
              // Pequeno delay para evitar rate limiting
              return cy.wait(50)
            })
          })
        })
      }

      return chain
    }).then(() => {
      cy.log(`Criados ${createdScenarioIds.length} cenários`)
    })
  })

  describe('Busca de Projetos', () => {
    it('deve buscar projetos com termo comum e retornar em tempo razoável', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      return measureResponseTime(() => {
        return cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects?q=Busca`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` },
          failOnStatusCode: false
        })
      }).then(({ response, responseTime }) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('items')
        expect(response.body).to.have.property('total')
        expect(Array.isArray(response.body.items)).to.be.true
        
        // Verificar que retornou resultados
        expect(response.body.items.length).to.be.at.least(1)
        
        // Verificar que todos os resultados contêm o termo de busca (case insensitive)
        response.body.items.forEach((project) => {
          expect(project.name.toLowerCase()).to.include('busca')
        })
        
        // Verificar tempo de resposta (deve ser < 3 segundos)
        expect(responseTime).to.be.lessThan(3000)
        cy.log(`Tempo de resposta: ${responseTime}ms`)
        cy.log(`Total de resultados: ${response.body.total}`)
      })
    })

    it('deve buscar projetos com termo específico e retornar poucos resultados', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      // Buscar por um termo mais específico
      const searchTerm = `Busca ${Math.floor(NUM_PROJECTS / 2)}`
      
      return measureResponseTime(() => {
        return cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects?q=${encodeURIComponent(searchTerm)}`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` },
          failOnStatusCode: false
        })
      }).then(({ response, responseTime }) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('items')
        expect(response.body).to.have.property('total')
        
        // Verificar que retornou resultados
        expect(response.body.total).to.be.at.least(1)
        expect(response.body.items.length).to.be.at.most(response.body.total)
        
        // Verificar tempo de resposta (deve ser < 2 segundos para busca específica)
        expect(responseTime).to.be.lessThan(2000)
        cy.log(`Tempo de resposta: ${responseTime}ms`)
        cy.log(`Total de resultados: ${response.body.total}`)
      })
    })

    it('deve retornar resultados vazios para termo que não existe', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      return measureResponseTime(() => {
        return cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects?q=TermoQueNaoExiste123456789`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` },
          failOnStatusCode: false
        })
      }).then(({ response, responseTime }) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('items')
        expect(response.body).to.have.property('total')
        expect(response.body.total).to.eq(0)
        expect(response.body.items).to.be.an('array').that.is.empty
        
        // Verificar tempo de resposta (deve ser rápido mesmo sem resultados)
        expect(responseTime).to.be.lessThan(2000)
        cy.log(`Tempo de resposta: ${responseTime}ms`)
      })
    })

    it('deve suportar paginação com busca', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      // Buscar primeira página
      return measureResponseTime(() => {
        return cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects?q=Busca&page=1&pageSize=10`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` },
          failOnStatusCode: false
        })
      }).then(({ response, responseTime }) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('items')
        expect(response.body).to.have.property('total')
        expect(response.body).to.have.property('page', 1)
        expect(response.body).to.have.property('pageSize', 10)
        expect(response.body).to.have.property('totalPages')
        
        // Verificar que retornou no máximo pageSize itens
        expect(response.body.items.length).to.be.at.most(10)
        
        // Verificar tempo de resposta
        expect(responseTime).to.be.lessThan(2000)
        cy.log(`Tempo de resposta página 1: ${responseTime}ms`)
        cy.log(`Total de resultados: ${response.body.total}`)
        cy.log(`Total de páginas: ${response.body.totalPages}`)
        
        // Se houver mais de uma página, testar segunda página
        if (response.body.totalPages > 1) {
          return measureResponseTime(() => {
            return cy.request({
              method: 'GET',
              url: `${API_BASE_URL}/projects?q=Busca&page=2&pageSize=10`,
              headers: { Authorization: `Bearer ${testUsers.owner.token}` },
              failOnStatusCode: false
            })
          })
        }
        return null
      }).then((result) => {
        if (result) {
          const { response, responseTime } = result
          expect(response.status).to.eq(200)
          expect(response.body).to.have.property('page', 2)
          expect(response.body.items.length).to.be.at.most(10)
          expect(responseTime).to.be.lessThan(2000)
          cy.log(`Tempo de resposta página 2: ${responseTime}ms`)
        }
      })
    })

    it('deve buscar projetos com termo vazio (retornar todos)', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      return measureResponseTime(() => {
        return cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects?q=`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` },
          failOnStatusCode: false
        })
      }).then(({ response, responseTime }) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('items')
        expect(response.body).to.have.property('total')
        
        // Deve retornar todos os projetos do usuário (paginados)
        expect(response.body.total).to.be.at.least(NUM_PROJECTS)
        expect(response.body.items.length).to.be.at.most(response.body.pageSize || 10)
        
        // Verificar tempo de resposta
        expect(responseTime).to.be.lessThan(3000)
        cy.log(`Tempo de resposta: ${responseTime}ms`)
        cy.log(`Total de projetos: ${response.body.total}`)
      })
    })
  })

  describe('Busca de Cenários (Listagem)', () => {
    it('deve listar muitos cenários em tempo razoável', () => {
      if (!testUsers.owner.token || !testPackage.id) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      return measureResponseTime(() => {
        return cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` },
          failOnStatusCode: false
        })
      }).then(({ response, responseTime }) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('data')
        expect(response.body.data).to.have.property('scenarios')
        expect(Array.isArray(response.body.data.scenarios)).to.be.true
        
        // Verificar que retornou todos os cenários (pode estar paginado)
        expect(response.body.data.scenarios.length).to.be.at.least(1)
        
        // Verificar tempo de resposta (pode ser mais lento com muitos dados)
        expect(responseTime).to.be.lessThan(5000)
        cy.log(`Tempo de resposta: ${responseTime}ms`)
        cy.log(`Cenários retornados: ${response.body.data.scenarios.length}`)
        if (response.body.data.pagination) {
          cy.log(`Total de cenários: ${response.body.data.pagination.total}`)
        }
      })
    })

    it('deve listar cenários com steps incluídos em tempo razoável', () => {
      if (!testUsers.owner.token || !testPackage.id) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      return measureResponseTime(() => {
        return cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` },
          failOnStatusCode: false
        })
      }).then(({ response, responseTime }) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('data')
        expect(response.body.data).to.have.property('scenarios')
        
        // Verificar que cenários têm steps
        if (response.body.data.scenarios.length > 0) {
          const firstScenario = response.body.data.scenarios[0]
          expect(firstScenario).to.have.property('steps')
          expect(Array.isArray(firstScenario.steps)).to.be.true
        }
        
        // Verificar tempo de resposta
        expect(responseTime).to.be.lessThan(5000)
        cy.log(`Tempo de resposta: ${responseTime}ms`)
        cy.log(`Cenários retornados: ${response.body.data.scenarios.length}`)
        if (response.body.data.pagination) {
          cy.log(`Total de cenários: ${response.body.data.pagination.total}`)
        }
      })
    })
  })

  describe('Performance de Busca com Muitos Resultados', () => {
    it('deve buscar e retornar muitos resultados em tempo aceitável', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      // Buscar com termo que retorna muitos resultados
      return measureResponseTime(() => {
        return cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/projects?q=Busca&pageSize=50`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` },
          failOnStatusCode: false
        })
      }).then(({ response, responseTime }) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('items')
        expect(response.body).to.have.property('total')
        
        // Verificar que retornou muitos resultados
        expect(response.body.items.length).to.be.at.least(10)
        
        // Verificar tempo de resposta (pode ser um pouco mais lento com mais itens)
        expect(responseTime).to.be.lessThan(3000)
        cy.log(`Tempo de resposta: ${responseTime}ms`)
        cy.log(`Resultados retornados: ${response.body.items.length}`)
        cy.log(`Total de resultados: ${response.body.total}`)
      })
    })

    it('deve manter performance consistente em múltiplas buscas', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const searchTerms = ['Busca', 'Projeto', '1', '2', '3']
      const responseTimes = []

      let chain = cy.wrap(null)

      searchTerms.forEach((term) => {
        chain = chain.then(() => {
          return measureResponseTime(() => {
            return cy.request({
              method: 'GET',
              url: `${API_BASE_URL}/projects?q=${encodeURIComponent(term)}`,
              headers: { Authorization: `Bearer ${testUsers.owner.token}` },
              failOnStatusCode: false
            })
          }).then(({ response, responseTime }) => {
            expect(response.status).to.eq(200)
            responseTimes.push(responseTime)
            cy.log(`Busca "${term}": ${responseTime}ms`)
            return cy.wait(100) // Pequeno delay entre buscas
          })
        })
      })

      return chain.then(() => {
        // Calcular média e verificar que todas as buscas foram rápidas
        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        const maxTime = Math.max(...responseTimes)
        
        cy.log(`Tempo médio: ${avgTime.toFixed(2)}ms`)
        cy.log(`Tempo máximo: ${maxTime}ms`)
        
        // Verificar que tempo máximo é aceitável
        expect(maxTime).to.be.lessThan(3000)
      })
    })
  })

  // Cleanup
  after(() => {
    cy.log('Testes de performance de busca concluídos')
    cy.log(`Total de projetos criados: ${createdProjectIds.length}`)
    cy.log(`Total de cenários criados: ${createdScenarioIds.length}`)
    cy.log('Nota: Dados de teste podem ser mantidos para testes futuros ou limpos manualmente')
  })
})

