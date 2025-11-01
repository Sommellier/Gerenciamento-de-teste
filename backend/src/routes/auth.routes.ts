import { Router, Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from '../utils/AppError'

const router = Router()

// Helper para async handlers
const asyncH = (fn: any) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// Refresh access token using refresh token
const refreshTokenHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body
  
  if (!refreshToken || (typeof refreshToken === 'string' && refreshToken.trim() === '')) {
    return res.status(400).json({ message: 'Refresh token é obrigatório' })
  }

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    return res.status(500).json({ message: 'JWT secret not configured' })
  }

  // Verificar refresh token
  let payload: any
  try {
    payload = jwt.verify(refreshToken, jwtSecret) as any
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token expirado' })
    }
    return res.status(401).json({ message: 'Token inválido' })
  }
  
  if (payload.type !== 'refresh') {
    return res.status(401).json({ message: 'Token inválido' })
  }

  // Gerar novo access token
  const accessToken = jwt.sign(
    { userId: payload.userId, email: payload.email, type: 'access' },
    jwtSecret,
    { expiresIn: '1h' }
  )

  return res.json({ accessToken })
}

router.post('/refresh-token', asyncH(refreshTokenHandler))

export default router

