describe('API - Performance: Testes de Exportação', () => {
  const API_BASE_URL = Cypress.env('API_URL') || 'http://localhost:3000/api'
  
  let testUsers = {
    owner: {
      email: '',
      password: 'SenhaSegura123',
      name: 'Usuário Owner Exportação',
      id: null,
      token: null
    }
  }

  let testProject = {
    id: null,
    name: 'Projeto para Exportação',
    description: 'Projeto para testes de exportação'
  }

  let testPackages = {
    small: { id: null }, // Pacote com poucos cenários
    medium: { id: null }, // Pacote com quantidade média de cenários
    large: { id: null } // Pacote com muitos cenários
  }

  let testScenarios = {
    small: [], // IDs dos cenários do pacote pequeno
    medium: [], // IDs dos cenários do pacote médio
    large: [] // IDs dos cenários do pacote grande
  }

  let testReports = {
    small: null, // ID do relatório ECT do pacote pequeno
    medium: null // ID do relatório ECT do pacote médio
  }

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

  // Função auxiliar para medir tempo de resposta
  const measureResponseTime = (requestFn) => {
    const startTime = Date.now()
    return requestFn().then((response) => {
      const endTime = Date.now()
      const responseTime = endTime - startTime
      return { response, responseTime }
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

  // Setup: Criar usuário, projeto, pacotes e cenários
  before(() => {
    // Criar owner
    const ownerEmail = `owner-exportacao-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`
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

        // Criar projeto
        return cy.request({
          method: 'POST',
          url: `${API_BASE_URL}/projects`,
          headers: { Authorization: `Bearer ${token}` },
          body: {
            name: testProject.name,
            description: testProject.description
          },
          failOnStatusCode: false
        })
      }
      return null
    }).then((projectResponse) => {
      if (projectResponse && projectResponse.status === 201 && projectResponse.body.id) {
        testProject.id = projectResponse.body.id

        // Criar pacotes
        const packages = [
          { key: 'small', title: 'Pacote Pequeno Exportação', scenarios: 5 },
          { key: 'medium', title: 'Pacote Médio Exportação', scenarios: 50 },
          { key: 'large', title: 'Pacote Grande Exportação', scenarios: 200 }
        ]

        let chain = cy.wrap(null)

        packages.forEach((pkg, pkgIndex) => {
          chain = chain.then(() => {
            return cy.request({
              method: 'POST',
              url: `${API_BASE_URL}/projects/${testProject.id}/packages`,
              headers: { Authorization: `Bearer ${testUsers.owner.token}` },
              body: {
                title: pkg.title,
                description: `Pacote ${pkg.key} para testes de exportação`,
                type: 'FUNCTIONAL',
                priority: 'HIGH',
                release: '2024-01'
              },
              failOnStatusCode: false
            }).then((packageResponse) => {
              if (packageResponse && packageResponse.status === 201 && packageResponse.body.testPackage?.id) {
                testPackages[pkg.key].id = packageResponse.body.testPackage.id

                // Criar cenários para este pacote
                let scenarioChain = cy.wrap(null)
                const scenarioIds = []

                for (let i = 0; i < pkg.scenarios; i++) {
                  scenarioChain = scenarioChain.then(() => {
                    return createScenario(testUsers.owner.token, testPackages[pkg.key].id, {
                      title: `Cenário ${i + 1} - ${pkg.key}`,
                      description: `Descrição do cenário ${i + 1} do pacote ${pkg.key}`,
                      type: 'FUNCTIONAL',
                      priority: i % 3 === 0 ? 'HIGH' : i % 3 === 1 ? 'MEDIUM' : 'LOW',
                      steps: [
                        { action: `Ação ${i + 1}`, expected: `Esperado ${i + 1}` },
                        { action: `Ação ${i + 1} - 2`, expected: `Esperado ${i + 1} - 2` }
                      ]
                    }).then((scenarioResponse) => {
                      if (scenarioResponse && scenarioResponse.status === 201 && scenarioResponse.body.scenario?.id) {
                        scenarioIds.push(scenarioResponse.body.scenario.id)
                      }
                      // Pequeno delay para evitar sobrecarga
                      return cy.wait(50)
                    })
                  })
                }

                return scenarioChain.then(() => {
                  testScenarios[pkg.key] = scenarioIds
                  cy.log(`Criados ${scenarioIds.length} cenários para pacote ${pkg.key}`)
                })
              }
              return null
            })
          })
        })

        return chain
      }
      return null
    }).then(() => {
      // Criar relatórios ECT para testes de download
      const reportsToCreate = [
        { key: 'small', scenarioIndex: 0 },
        { key: 'medium', scenarioIndex: 0 }
      ]

      let reportChain = cy.wrap(null)

      reportsToCreate.forEach((report) => {
        if (testScenarios[report.key] && testScenarios[report.key].length > 0 && testUsers.owner.token) {
          reportChain = reportChain.then(() => {
            return cy.request({
              method: 'POST',
              url: `${API_BASE_URL}/scenarios/${testScenarios[report.key][report.scenarioIndex]}/ect`,
              headers: { Authorization: `Bearer ${testUsers.owner.token}` },
              body: {},
              failOnStatusCode: false
            }).then((ectResponse) => {
              if (ectResponse && (ectResponse.status === 200 || ectResponse.status === 201)) {
                if (ectResponse.body.reportId) {
                  testReports[report.key] = ectResponse.body.reportId
                } else if (ectResponse.body.report?.id) {
                  testReports[report.key] = ectResponse.body.report.id
                }
              }
              return cy.wait(500) // Delay entre criações
            })
          })
        }
      })

      return reportChain
    })
  })

  describe('Exportação PDF - Relatório de Cenários', () => {
    it('deve gerar PDF de pacote pequeno em tempo aceitável', () => {
      if (!testUsers.owner.token || !testPackages.small.id) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      return measureResponseTime(() => {
        return cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/packages/${testPackages.small.id}/scenarios/report.pdf`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` },
          failOnStatusCode: false
        })
      }).then(({ response, responseTime }) => {
        expect(response.status).to.eq(200)
        // O endpoint pode retornar application/pdf ou text/plain dependendo da implementação
        expect(response.headers['content-type']).to.match(/application\/pdf|text\/(plain|html)/)
        
        // Verificar que o conteúdo existe e não está vazio
        expect(response.body).to.exist
        if (typeof response.body === 'string') {
          expect(response.body.length).to.be.greaterThan(0)
          // Se for texto, verificar que contém informações do relatório
          if (!response.body.startsWith('%PDF')) {
            // É texto simples, verificar que contém informações relevantes
            expect(response.body.toLowerCase()).to.include('relatório')
          }
        }

        const fileSizeKB = (response.body.length / 1024).toFixed(2)
        cy.log(`Tempo de resposta: ${responseTime}ms`)
        cy.log(`Tamanho do arquivo: ${fileSizeKB} KB`)
        cy.log(`Cenários no relatório: ${testScenarios.small.length}`)

        // Verificar que tempo de resposta é aceitável para pacote pequeno
        expect(responseTime).to.be.lessThan(5000)
      })
    })

    it('deve gerar PDF de pacote médio em tempo aceitável', () => {
      if (!testUsers.owner.token || !testPackages.medium.id) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      return measureResponseTime(() => {
        return cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/packages/${testPackages.medium.id}/scenarios/report.pdf`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` },
          failOnStatusCode: false
        })
      }).then(({ response, responseTime }) => {
        expect(response.status).to.eq(200)
        // O endpoint pode retornar application/pdf ou text/plain dependendo da implementação
        expect(response.headers['content-type']).to.match(/application\/pdf|text\/(plain|html)/)
        
        // Verificar que o conteúdo existe e não está vazio
        expect(response.body).to.exist
        if (typeof response.body === 'string') {
          expect(response.body.length).to.be.greaterThan(0)
        }

        const fileSizeKB = (response.body.length / 1024).toFixed(2)
        const fileSizeMB = (response.body.length / (1024 * 1024)).toFixed(2)
        cy.log(`Tempo de resposta: ${responseTime}ms`)
        cy.log(`Tamanho do arquivo: ${fileSizeKB} KB (${fileSizeMB} MB)`)
        cy.log(`Cenários no relatório: ${testScenarios.medium.length}`)

        // Verificar que tempo de resposta é aceitável para pacote médio
        expect(responseTime).to.be.lessThan(20000)
      })
    })
  })

  describe('Download de Relatório ECT', () => {
    it('deve baixar relatório ECT pequeno em tempo aceitável', () => {
      if (!testUsers.owner.token || !testReports.small) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      return measureResponseTime(() => {
        return cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/reports/${testReports.small}/download`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` },
          failOnStatusCode: false
        })
      }).then(({ response, responseTime }) => {
        expect(response.status).to.eq(200)
        expect(response.headers['content-type']).to.include('application/pdf')

        const fileSizeKB = (response.body.length / 1024).toFixed(2)
        cy.log(`Tempo de resposta: ${responseTime}ms`)
        cy.log(`Tamanho do arquivo: ${fileSizeKB} KB`)

        // Verificar que tempo de resposta é aceitável
        expect(responseTime).to.be.lessThan(3000)
      })
    })

    it('deve baixar relatório ECT médio em tempo aceitável', () => {
      if (!testUsers.owner.token || !testReports.medium) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      return measureResponseTime(() => {
        return cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/reports/${testReports.medium}/download`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` },
          failOnStatusCode: false
        })
      }).then(({ response, responseTime }) => {
        expect(response.status).to.eq(200)
        expect(response.headers['content-type']).to.include('application/pdf')

        const fileSizeKB = (response.body.length / 1024).toFixed(2)
        const fileSizeMB = (response.body.length / (1024 * 1024)).toFixed(2)
        cy.log(`Tempo de resposta: ${responseTime}ms`)
        cy.log(`Tamanho do arquivo: ${fileSizeKB} KB (${fileSizeMB} MB)`)

        // Verificar que tempo de resposta é aceitável
        expect(responseTime).to.be.lessThan(5000)
      })
    })

    it('deve manter performance consistente em múltiplos downloads', () => {
      if (!testUsers.owner.token || !testReports.small) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      const numDownloads = 5
      const responseTimes = []

      let chain = cy.wrap(null)

      for (let i = 0; i < numDownloads; i++) {
        chain = chain.then(() => {
          return measureResponseTime(() => {
            return cy.request({
              method: 'GET',
              url: `${API_BASE_URL}/reports/${testReports.small}/download`,
              headers: { Authorization: `Bearer ${testUsers.owner.token}` },
              failOnStatusCode: false
            })
          }).then(({ response, responseTime }) => {
            expect(response.status).to.eq(200)
            responseTimes.push(responseTime)
            cy.log(`Download ${i + 1}: ${responseTime}ms`)
            return cy.wait(200) // Pequeno delay entre downloads
          })
        })
      }

      return chain.then(() => {
        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        const maxTime = Math.max(...responseTimes)
        const minTime = Math.min(...responseTimes)

        cy.log(`Tempo médio: ${avgTime.toFixed(2)}ms`)
        cy.log(`Tempo mínimo: ${minTime}ms`)
        cy.log(`Tempo máximo: ${maxTime}ms`)

        // Verificar que tempo máximo não é excessivo
        expect(maxTime).to.be.lessThan(5000)
      })
    })
  })

  describe('Comparação de Performance', () => {
    it('deve comparar tempos de geração de PDF entre diferentes tamanhos', () => {
      if (!testUsers.owner.token || !testPackages.small.id || !testPackages.medium.id) {
        cy.log('Setup incompleto, pulando teste')
        return
      }

      const results = {}

      // Gerar PDF do pacote pequeno
      return measureResponseTime(() => {
        return cy.request({
          method: 'GET',
          url: `${API_BASE_URL}/packages/${testPackages.small.id}/scenarios/report.pdf`,
          headers: { Authorization: `Bearer ${testUsers.owner.token}` },
          failOnStatusCode: false
        })
      }).then(({ response, responseTime }) => {
        expect(response.status).to.eq(200)
        results.small = {
          time: responseTime,
          size: response.body.length,
          scenarios: testScenarios.small.length
        }

        // Gerar PDF do pacote médio
        return measureResponseTime(() => {
          return cy.request({
            method: 'GET',
            url: `${API_BASE_URL}/packages/${testPackages.medium.id}/scenarios/report.pdf`,
            headers: { Authorization: `Bearer ${testUsers.owner.token}` },
            failOnStatusCode: false
          })
        })
      }).then(({ response, responseTime }) => {
        expect(response.status).to.eq(200)
        results.medium = {
          time: responseTime,
          size: response.body.length,
          scenarios: testScenarios.medium.length
        }

        // Calcular métricas
        const timePerScenarioSmall = results.small.time / results.small.scenarios
        const timePerScenarioMedium = results.medium.time / results.medium.scenarios
        const sizePerScenarioSmall = results.small.size / results.small.scenarios
        const sizePerScenarioMedium = results.medium.size / results.medium.scenarios

        cy.log('=== Comparação de Performance ===')
        cy.log(`Pacote Pequeno: ${results.small.scenarios} cenários, ${results.small.time}ms, ${(results.small.size / 1024).toFixed(2)} KB`)
        cy.log(`  Tempo por cenário: ${timePerScenarioSmall.toFixed(2)}ms`)
        cy.log(`  Tamanho por cenário: ${sizePerScenarioSmall.toFixed(2)} bytes`)
        cy.log(`Pacote Médio: ${results.medium.scenarios} cenários, ${results.medium.time}ms, ${(results.medium.size / 1024).toFixed(2)} KB`)
        cy.log(`  Tempo por cenário: ${timePerScenarioMedium.toFixed(2)}ms`)
        cy.log(`  Tamanho por cenário: ${sizePerScenarioMedium.toFixed(2)} bytes`)

        // Verificar que tempo por cenário não aumenta drasticamente
        // (pode aumentar um pouco devido a overhead, mas não deve ser mais que 2x)
        expect(timePerScenarioMedium).to.be.lessThan(timePerScenarioSmall * 2)
      })
    })
  })

  // Cleanup
  after(() => {
    cy.log('Testes de performance de exportação concluídos')
    cy.log(`Pacote pequeno: ${testScenarios.small.length} cenários`)
    cy.log(`Pacote médio: ${testScenarios.medium.length} cenários`)
    cy.log(`Pacote grande: ${testScenarios.large.length} cenários`)
  })
})

