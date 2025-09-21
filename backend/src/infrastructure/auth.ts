import { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'

type JwtPayload = { userId: number; email?: string; iat?: number; exp?: number }

export const auth: RequestHandler = (req, res, next) => {
  try {
    console.log('Auth middleware called for:', req.method, req.path)
    console.log('Authorization header:', req.headers.authorization)
    
    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')

    if (!token || String(scheme).toLowerCase() !== 'bearer') {
      console.log('No token or invalid scheme - returning 401')
      res.status(401).json({ message: 'Não autenticado' })
      return
    }

    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.log('JWT secret not configured')
      res.status(500).json({ message: 'JWT secret not configured' })
      return
    }

    const payload = jwt.verify(token, secret) as JwtPayload
    if (!payload?.userId || !Number.isInteger(payload.userId)) {
      console.log('Invalid payload:', payload)
      res.status(401).json({ message: 'Token inválido' })
      return
    }

    console.log('User authenticated:', payload.userId)
    ;(req as any).user = { id: payload.userId }
    next()
  } catch (error) {
    console.log('Auth error:', error)
    res.status(401).json({ message: 'Token inválido' })
  }
}

export default auth


