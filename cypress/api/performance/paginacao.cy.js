describe('API - Performance: Testes de Paginação', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner Paginação',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null,
    name: 'Projeto para Paginação',
    description: 'Projeto para testes de performance de paginação'
  }

  let testPackage = {
    id: null
  }

  const NUM_PROJECTS = 150 // Número de projetos para criar
  const NUM_SCENARIOS = 300 // Número de cenários para criar
  const createdProjectIds = []
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

  // Setup: Criar usuário e muitos dados para paginação
  before(() => {
    // Criar owner
    const ownerEmail = `owner-paginacao-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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
        return createPackage(testUsers.owner.token, testProject.id, {
          title: 'Pacote para Paginação',
          description: 'Pacote para testes de paginação',
          type: 'FUNCTIONAL',
          priority: 'HIGH',
          release: '2024-01'
        })
      }
      return null
    }).then((packageResponse) => {
      if (packageResponse && packageResponse.status === 201 && packageResponse.body.testPackage?.id) {
        testPackage.id = packageResponse.body.testPackage.id

        // Criar muitos projetos para testes de paginação
        let projectChain = cy.wrap(null)
        for (let i = 0; i < NUM_PROJECTS; i++) {
          projectChain = projectChain.then(() => {
            return createProject(testUsers.owner.token, {
              name: `Projeto Paginação ${i + 1}`,
              description: `Descrição do projeto ${i + 1} para testes de paginação`
            }).then((response) => {
              if (response && response.status === 201 && response.body.id) {
                createdProjectIds.push(response.body.id)
              }
              return cy.wait(50) // Pequeno delay
            })
          })
        }

        return projectChain.then(() => {
          cy.log(`Criados ${createdProjectIds.length} projetos para paginação`)

          // Criar muitos cenários para testes de paginação
          let scenarioChain = cy.wrap(null)
          for (let i = 0; i < NUM_SCENARIOS; i++) {
            scenarioChain = scenarioChain.then(() => {
              return createScenario(testUsers.owner.token, testPackage.id, {
                title: `Cenário Paginação ${i + 1}`,
                description: `Descrição do cenário ${i + 1} para testes de paginação`,
                type: 'FUNCTIONAL',
                priority: i % 3 === 0 ? 'HIGH' : i % 3 === 1 ? 'MEDIUM' : 'LOW',
                steps: [
                  { action: `Ação ${i + 1}`, expected: `Esperado ${i + 1}` }
                ]
              }).then((response) => {
                if (response && response.status === 201 && response.body.scenario?.id) {
                  createdScenarioIds.push(response.body.scenario.id)
                }
                return cy.wait(30) // Pequeno delay
              })
            })
          }

          return scenarioChain.then(() => {
            cy.log(`Criados ${createdScenarioIds.length} cenários para paginação`)
          })
        })
      }
      return null
    })
  })

  describe('Paginação de Projetos', () => {
    it('deve ter performance consistente com diferentes tamanhos de página', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const pageSizes = [10, 20, 50, 100]
      const results = []

      let chain = cy.wrap(null)

      pageSizes.forEach((pageSize) => {
        chain = chain.then(() => {
          return measureResponseTime(() => {
            return cy.request({
              method: 'GET',
              url: `${API_BASE_URL}/projects?page=1&pageSize=${pageSize}`,
              headers: { Authorization: `Bearer ${testUsers.owner.token}` },
              failOnStatusCode: false
            })
          }).then(({ response, responseTime }) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('items')
            expect(response.body).to.have.property('total')
            expect(response.body).to.have.property('page')
            expect(response.body).to.have.property('pageSize')
            expect(response.body).to.have.property('totalPages')
            expect(response.body.items.length).to.be.at.most(pageSize)

            results.push({
              pageSize,
              responseTime,
              itemsCount: response.body.items.length,
              total: response.body.total
            })

            cy.log(`PageSize ${pageSize}: ${responseTime}ms, ${response.body.items.length} itens`)
            return cy.wait(200) // Delay entre requisições
          })
        })
      })

      return chain.then(() => {
        const avgTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
        const maxTime = Math.max(...results.map(r => r.responseTime))
        const minTime = Math.min(...results.map(r => r.responseTime))

        cy.log(`Tempo médio: ${avgTime.toFixed(2)}ms`)
        cy.log(`Tempo mínimo: ${minTime}ms`)
        cy.log(`Tempo máximo: ${maxTime}ms`)

        // Verificar que tempo máximo é aceitável
        expect(maxTime).to.be.lessThan(3000)
        // Verificar que não há grande variação entre tamanhos de página
        expect(maxTime / minTime).to.be.lessThan(3)
      })
    })

    it('deve ter performance consistente ao navegar por múltiplas páginas', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const pageSize = 20
      const numPages = 5
      const results = []

      let chain = cy.wrap(null)

      for (let page = 1; page <= numPages; page++) {
        chain = chain.then(() => {
          return measureResponseTime(() => {
            return cy.request({
              method: 'GET',
              url: `${API_BASE_URL}/projects?page=${page}&pageSize=${pageSize}`,
              headers: { Authorization: `Bearer ${testUsers.owner.token}` },
              failOnStatusCode: false
            })
          }).then(({ response, responseTime }) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('items')
            expect(response.body).to.have.property('page')
            expect(response.body).to.have.property('pageSize')
            expect(response.body).to.have.property('total')
            expect(response.body).to.have.property('totalPages')
            expect(response.body.page).to.eq(page)

            results.push({
              page,
              responseTime,
              itemsCount: response.body.items.length
            })

            cy.log(`Página ${page}: ${responseTime}ms, ${response.body.items.length} itens`)
            return cy.wait(200) // Delay entre requisições
          })
        })
      }

      return chain.then(() => {
        const avgTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
        const maxTime = Math.max(...results.map(r => r.responseTime))
        const minTime = Math.min(...results.map(r => r.responseTime))

        cy.log(`Tempo médio: ${avgTime.toFixed(2)}ms`)
        cy.log(`Tempo mínimo: ${minTime}ms`)
        cy.log(`Tempo máximo: ${maxTime}ms`)

        // Verificar que tempo máximo é aceitável
        expect(maxTime).to.be.lessThan(3000)
        // Verificar que não há grande variação entre páginas
        expect(maxTime / minTime).to.be.lessThan(2.5)
      })
    })

    it('deve retornar dados corretos em cada página', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const pageSize = 10
      const numPages = 3
      const allItems = []

      let chain = cy.wrap(null)

      for (let page = 1; page <= numPages; page++) {
        chain = chain.then(() => {
          return cy.request({
            method: 'GET',
            url: `${API_BASE_URL}/projects?page=${page}&pageSize=${pageSize}`,
            headers: { Authorization: `Bearer ${testUsers.owner.token}` },
            failOnStatusCode: false
          }).then((response) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('items')
            expect(response.body).to.have.property('page')
            expect(response.body).to.have.property('pageSize')
            expect(response.body).to.have.property('total')
            expect(response.body).to.have.property('totalPages')

            const items = response.body.items
            items.forEach(item => {
              allItems.push(item.id)
            })

            // Verificar que a paginação está correta
            expect(response.body.page).to.eq(page)
            expect(response.body.pageSize).to.eq(pageSize)
            expect(items.length).to.be.at.most(pageSize)

            return cy.wait(100)
          })
        })
      }

      return chain.then(() => {
        // Verificar que não há duplicatas entre páginas
        const uniqueItems = [...new Set(allItems)]
        expect(uniqueItems.length).to.eq(allItems.length)

        cy.log(`Total de itens únicos em ${numPages} páginas: ${uniqueItems.length}`)
      })
    })
  })

  describe('Paginação de Cenários', () => {
    it('deve ter performance consistente com diferentes tamanhos de página', () => {
      if (!testUsers.owner.token || !testPackage.id) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      const pageSizes = [10, 20, 50, 100]
      const results = []

      let chain = cy.wrap(null)

      pageSizes.forEach((pageSize) => {
        chain = chain.then(() => {
          return measureResponseTime(() => {
            return cy.request({
              method: 'GET',
              url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios?page=1&pageSize=${pageSize}`,
              headers: { Authorization: `Bearer ${testUsers.owner.token}` },
              failOnStatusCode: false
            })
          }).then(({ response, responseTime }) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('data')
            expect(response.body.data).to.have.property('scenarios')
            expect(response.body.data).to.have.property('pagination')
            expect(response.body.data.scenarios.length).to.be.at.most(pageSize)

            results.push({
              pageSize,
              responseTime,
              itemsCount: response.body.data.scenarios.length,
              total: response.body.data.pagination.total
            })

            cy.log(`PageSize ${pageSize}: ${responseTime}ms, ${response.body.data.scenarios.length} cenários`)
            return cy.wait(200) // Delay entre requisições
          })
        })
      })

      return chain.then(() => {
        const avgTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
        const maxTime = Math.max(...results.map(r => r.responseTime))
        const minTime = Math.min(...results.map(r => r.responseTime))

        cy.log(`Tempo médio: ${avgTime.toFixed(2)}ms`)
        cy.log(`Tempo mínimo: ${minTime}ms`)
        cy.log(`Tempo máximo: ${maxTime}ms`)

        // Verificar que tempo máximo é aceitável
        expect(maxTime).to.be.lessThan(5000)
        // Verificar que não há grande variação entre tamanhos de página
        expect(maxTime / minTime).to.be.lessThan(3)
      })
    })

    it('deve ter performance consistente ao navegar por múltiplas páginas', () => {
      if (!testUsers.owner.token || !testPackage.id) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      const pageSize = 20
      const numPages = 5
      const results = []

      let chain = cy.wrap(null)

      for (let page = 1; page <= numPages; page++) {
        chain = chain.then(() => {
          return measureResponseTime(() => {
            return cy.request({
              method: 'GET',
              url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios?page=${page}&pageSize=${pageSize}`,
              headers: { Authorization: `Bearer ${testUsers.owner.token}` },
              failOnStatusCode: false
            })
          }).then(({ response, responseTime }) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('data')
            expect(response.body.data).to.have.property('scenarios')
            expect(response.body.data).to.have.property('pagination')
            expect(response.body.data.pagination.page).to.eq(page)

            results.push({
              page,
              responseTime,
              itemsCount: response.body.data.scenarios.length
            })

            cy.log(`Página ${page}: ${responseTime}ms, ${response.body.data.scenarios.length} cenários`)
            return cy.wait(200) // Delay entre requisições
          })
        })
      }

      return chain.then(() => {
        const avgTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
        const maxTime = Math.max(...results.map(r => r.responseTime))
        const minTime = Math.min(...results.map(r => r.responseTime))

        cy.log(`Tempo médio: ${avgTime.toFixed(2)}ms`)
        cy.log(`Tempo mínimo: ${minTime}ms`)
        cy.log(`Tempo máximo: ${maxTime}ms`)

        // Verificar que tempo máximo é aceitável
        expect(maxTime).to.be.lessThan(5000)
        // Verificar que não há grande variação entre páginas
        expect(maxTime / minTime).to.be.lessThan(2.5)
      })
    })

    it('deve retornar dados corretos em cada página', () => {
      if (!testUsers.owner.token || !testPackage.id) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      const pageSize = 10
      const numPages = 3
      const allItems = []

      let chain = cy.wrap(null)

      for (let page = 1; page <= numPages; page++) {
        chain = chain.then(() => {
          return cy.request({
            method: 'GET',
            url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios?page=${page}&pageSize=${pageSize}`,
            headers: { Authorization: `Bearer ${testUsers.owner.token}` },
            failOnStatusCode: false
          }).then((response) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('data')
            expect(response.body.data).to.have.property('scenarios')
            expect(response.body.data).to.have.property('pagination')

            const items = response.body.data.scenarios
            items.forEach(item => {
              allItems.push(item.id)
            })

            // Verificar que a paginação está correta
            expect(response.body.data.pagination.page).to.eq(page)
            expect(response.body.data.pagination.pageSize).to.eq(pageSize)
            expect(items.length).to.be.at.most(pageSize)

            return cy.wait(100)
          })
        })
      }

      return chain.then(() => {
        // Verificar que não há duplicatas entre páginas
        const uniqueItems = [...new Set(allItems)]
        expect(uniqueItems.length).to.eq(allItems.length)

        cy.log(`Total de cenários únicos em ${numPages} páginas: ${uniqueItems.length}`)
      })
    })
  })

  describe('Performance com Grandes Volumes', () => {
    it('deve manter performance aceitável ao paginar grandes volumes de projetos', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      const pageSize = 50
      const numPages = 3
      const results = []

      let chain = cy.wrap(null)

      for (let page = 1; page <= numPages; page++) {
        chain = chain.then(() => {
          return measureResponseTime(() => {
            return cy.request({
              method: 'GET',
              url: `${API_BASE_URL}/projects?page=${page}&pageSize=${pageSize}`,
              headers: { Authorization: `Bearer ${testUsers.owner.token}` },
              failOnStatusCode: false
            })
          }).then(({ response, responseTime }) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('items')
            expect(response.body.items.length).to.be.at.most(pageSize)

            results.push({
              page,
              responseTime,
              itemsCount: response.body.items.length
            })

            cy.log(`Página ${page} (${pageSize} itens): ${responseTime}ms`)
            return cy.wait(200)
          })
        })
      }

      return chain.then(() => {
        const avgTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
        const maxTime = Math.max(...results.map(r => r.responseTime))

        cy.log(`Tempo médio: ${avgTime.toFixed(2)}ms`)
        cy.log(`Tempo máximo: ${maxTime}ms`)

        // Verificar que tempo médio é aceitável mesmo com grandes volumes
        expect(avgTime).to.be.lessThan(2000)
        expect(maxTime).to.be.lessThan(3000)
      })
    })

    it('deve manter performance aceitável ao paginar grandes volumes de cenários', () => {
      if (!testUsers.owner.token || !testPackage.id) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      const pageSize = 50
      const numPages = 3
      const results = []

      let chain = cy.wrap(null)

      for (let page = 1; page <= numPages; page++) {
        chain = chain.then(() => {
          return measureResponseTime(() => {
            return cy.request({
              method: 'GET',
              url: `${API_BASE_URL}/packages/${testPackage.id}/scenarios?page=${page}&pageSize=${pageSize}`,
              headers: { Authorization: `Bearer ${testUsers.owner.token}` },
              failOnStatusCode: false
            })
          }).then(({ response, responseTime }) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('data')
            expect(response.body.data.scenarios.length).to.be.at.most(pageSize)

            results.push({
              page,
              responseTime,
              itemsCount: response.body.data.scenarios.length
            })

            cy.log(`Página ${page} (${pageSize} cenários): ${responseTime}ms`)
            return cy.wait(200)
          })
        })
      }

      return chain.then(() => {
        const avgTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
        const maxTime = Math.max(...results.map(r => r.responseTime))

        cy.log(`Tempo médio: ${avgTime.toFixed(2)}ms`)
        cy.log(`Tempo máximo: ${maxTime}ms`)

        // Verificar que tempo médio é aceitável mesmo com grandes volumes
        expect(avgTime).to.be.lessThan(3000)
        expect(maxTime).to.be.lessThan(5000)
      })
    })
  })

  describe('Validação de Paginação', () => {
    it('deve validar informações de paginação corretas', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      return cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects?page=1&pageSize=20`,
        headers: { Authorization: `Bearer ${testUsers.owner.token}` },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('page')
        expect(response.body).to.have.property('pageSize')
        expect(response.body).to.have.property('total')
        expect(response.body).to.have.property('totalPages')

        expect(response.body.page).to.eq(1)
        expect(response.body.pageSize).to.eq(20)
        expect(response.body.total).to.be.a('number')
        expect(response.body.totalPages).to.be.a('number')
        expect(response.body.totalPages).to.be.at.least(1)

        // Verificar que totalPages está correto
        const expectedTotalPages = Math.ceil(response.body.total / response.body.pageSize)
        expect(response.body.totalPages).to.eq(expectedTotalPages)

        cy.log(`Total: ${response.body.total}, TotalPages: ${response.body.totalPages}`)
      })
    })

    it('deve retornar página vazia quando página não existe', () => {
      if (!testUsers.owner.token) {
        cy.log('Token não disponível, pulando teste')
        return
      }

      return cy.request({
        method: 'GET',
        url: `${API_BASE_URL}/projects?page=99999&pageSize=20`,
        headers: { Authorization: `Bearer ${testUsers.owner.token}` },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('items')
        expect(response.body).to.have.property('page')
        expect(response.body).to.have.property('pageSize')
        expect(response.body).to.have.property('total')
        expect(response.body).to.have.property('totalPages')
        
        // Página inexistente deve retornar array vazio
        expect(response.body.items).to.be.an('array')
        expect(response.body.items.length).to.eq(0)
        
        expect(response.body.page).to.eq(99999)
      })
    })
  })

  // Cleanup
  after(() => {
    cy.log('Testes de performance de paginação concluídos')
    cy.log(`Total de projetos criados: ${createdProjectIds.length}`)
    cy.log(`Total de cenários criados: ${createdScenarioIds.length}`)
  })
})

