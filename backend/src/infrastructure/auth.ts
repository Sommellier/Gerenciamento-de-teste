import { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'

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
      console.error('JWT_SECRET não configurado')
      res.status(500).json({ message: 'JWT secret not configured' })
      return
    }

    const payload = jwt.verify(token, secret) as JwtPayload
    if (!payload?.userId || !Number.isInteger(payload.userId)) {
      res.status(401).json({ message: 'Token inválido' })
      return
    }

    ;(req as any).user = { id: payload.userId }
    next()
  } catch (error) {
    console.error('Erro de autenticação')
    res.status(401).json({ message: 'Token inválido' })
  }
}

export default auth


