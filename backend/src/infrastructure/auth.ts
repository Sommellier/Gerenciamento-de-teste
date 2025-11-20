import { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger'

type JwtPayload = { userId: number; email?: string; iat?: number; exp?: number }

export const auth: RequestHandler = (req, res, next) => {
  try {
    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')

    if (!token || String(scheme).toLowerCase() !== 'bearer') {
      res.status(401).json({ message: 'Não autenticado' })
      return
    }

    const secret = process.env.JWT_SECRET
    if (!secret) {
      // Não logar em ambiente de teste - é um erro esperado
      if (process.env.NODE_ENV !== 'test') {
        logger.error('JWT_SECRET não configurado')
      }
      res.status(500).json({ message: 'JWT secret not configured' })
      return
    }

    const payload = jwt.verify(token, secret) as any
    if (!payload?.userId || !Number.isInteger(payload.userId)) {
      res.status(401).json({ message: 'Token inválido' })
      return
    }

    // Verificar se é um access token válido
    // Se o token tiver campo type, deve ser 'access'
    if (payload.type && payload.type !== 'access') {
      res.status(401).json({ message: 'Tipo de token inválido' })
      return
    }

    ;(req as any).user = { id: payload.userId }
    next()
  } catch (error) {
    // Não logar erros esperados de autenticação em ambiente de teste
    if (process.env.NODE_ENV !== 'test') {
      logger.error('Erro de autenticação', error)
    }
    res.status(401).json({ message: 'Token inválido' })
  }
}

export default auth


