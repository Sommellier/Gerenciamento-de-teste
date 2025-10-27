import 'dotenv/config'
import { ECTController } from '../../controllers/ect.controller'
import { AppError } from '../../utils/AppError'

describe('ECTController', () => {
  let controller: ECTController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new ECTController()
  })

  describe('generateECT', () => {
    it('deve retornar erro 400 quando scenarioId é inválido', async () => {
      const req = {
        params: { id: 'invalid' },
        user: { id: 789 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.generateECT(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ message: 'ID do cenário inválido' })
    })

    it('deve retornar erro 401 quando usuário não está autenticado', async () => {
      const req = {
        params: { id: '456' },
        user: undefined
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.generateECT(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ message: 'Usuário não autenticado' })
    })

    it('deve tratar erro genérico', async () => {
      const req = {
        params: { id: '456' },
        user: { id: 789 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.generateECT(req, res, next)

      // O service retorna AppError 404 quando cenário não existe, que é o comportamento correto
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ message: 'Cenário não encontrado' })
    })
  })

  describe('downloadReport', () => {
    it('deve retornar erro 400 quando reportId é inválido', async () => {
      const req = {
        params: { id: 'invalid' },
        user: { id: 789 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.downloadReport(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ message: 'ID do relatório inválido' })
    })

    it('deve retornar erro 401 quando usuário não está autenticado', async () => {
      const req = {
        params: { id: '123' },
        user: undefined
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.downloadReport(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ message: 'Usuário não autenticado' })
    })

    it('deve tratar erro genérico', async () => {
      const req = {
        params: { id: '123' },
        user: { id: 789 }
      } as any

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any

      const next = jest.fn()

      await controller.downloadReport(req, res, next)

      // O service retorna AppError 404 quando relatório não existe, que é o comportamento correto
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ message: 'Relatório não encontrado' })
    })
  })
})