import { Router, Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import { AppError } from '../utils/AppError'
import { csrfProtection } from '../infrastructure/csrf'

const router = Router()

/**
 * @swagger
 * /api/csrf-token:
 *   get:
 *     summary: Obter token CSRF
 *     description: Retorna um token CSRF para proteção contra ataques CSRF
 *     tags: [Autenticação]
 *     responses:
 *       200:
 *         description: Token CSRF gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 *                   description: Token CSRF para uso em requisições subsequentes
 *                   example: "a1b2c3d4e5f6..."
 */

/**
 * @swagger
 * /api/refresh-token:
 *   post:
 *     summary: Atualizar token de acesso
 *     description: Gera um novo token de acesso usando um refresh token válido
 *     tags: [Autenticação]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token obtido no login (exemplo genérico)
 *                 example: "seu_refresh_token_aqui"
 *     responses:
 *       200:
 *         description: Novo token de acesso gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: Novo token de acesso JWT (exemplo genérico)
 *                   example: "seu_novo_access_token_aqui"
 *       400:
 *         description: Refresh token não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token inválido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Helper para async handlers
const asyncH = (fn: any) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next)

// Gerar e retornar CSRF token
const getCsrfTokenHandler = async (_req: Request, res: Response) => {
  // Gerar token CSRF aleatório
  const csrfToken = randomBytes(32).toString('hex')
  return res.json({ csrfToken })
}

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

router.post('/refresh-token', csrfProtection, asyncH(refreshTokenHandler))

// Rota pública para obter CSRF token (não requer autenticação)
router.get('/csrf-token', asyncH(getCsrfTokenHandler))

export default router

