describe('API - Server', () => {
  const BASE_URL = Cypress.env('API_URL')?.replace('/api', '') || 'http://localhost:3000'

  describe('GET /health - Health check', () => {
    it('deve retornar status ok', () => {
      cy.request({
        method: 'GET',
        url: `${BASE_URL}/health`
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('status', 'ok')
        expect(response.body).to.have.property('timestamp')
        expect(response.body.timestamp).to.be.a('string')
        // Verificar que o timestamp é uma data ISO válida
        expect(new Date(response.body.timestamp).toISOString()).to.eq(response.body.timestamp)
      })
    })

    it('deve retornar resposta rápida', () => {
      const startTime = Date.now()
      
      cy.request({
        method: 'GET',
        url: `${BASE_URL}/health`
      }).then((response) => {
        const endTime = Date.now()
        const responseTime = endTime - startTime
        
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('status', 'ok')
        // Health check deve ser rápido (menos de 1 segundo)
        expect(responseTime).to.be.lessThan(1000)
      })
    })

    it('deve funcionar sem autenticação', () => {
      // Health check não requer autenticação
      cy.request({
        method: 'GET',
        url: `${BASE_URL}/health`
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('status', 'ok')
      })
    })

    it('deve retornar timestamp atual', () => {
      const beforeRequest = new Date().toISOString()
      
      cy.request({
        method: 'GET',
        url: `${BASE_URL}/health`
      }).then((response) => {
        const afterRequest = new Date().toISOString()
        const responseTimestamp = response.body.timestamp
        
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('timestamp')
        
        // O timestamp deve estar entre antes e depois da requisição
        const responseDate = new Date(responseTimestamp)
        const beforeDate = new Date(beforeRequest)
        const afterDate = new Date(afterRequest)
        
        expect(responseDate.getTime()).to.be.at.least(beforeDate.getTime() - 1000) // Permitir 1 segundo de margem
        expect(responseDate.getTime()).to.be.at.most(afterDate.getTime() + 1000) // Permitir 1 segundo de margem
      })
    })
  })
})

