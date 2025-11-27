import { Request, Response, NextFunction } from 'express'

/**
 * Middleware de autenticação Basic Auth para proteger o Swagger UI
 * Usa variáveis de ambiente para credenciais (opcional em desenvolvimento)
 */
export const swaggerBasicAuth = (req: Request, res: Response, next: NextFunction): void => {
  // Em desenvolvimento, se não configurado, permite acesso sem autenticação
  // Em produção, sempre exige autenticação
  const isProduction = process.env.NODE_ENV === 'production'
  const swaggerUser = process.env.SWAGGER_USER || 'admin'
  const swaggerPassword = process.env.SWAGGER_PASSWORD || 'admin123'

  // Se não estiver em produção e não tiver credenciais configuradas, permite acesso
  if (!isProduction && !process.env.SWAGGER_USER && !process.env.SWAGGER_PASSWORD) {
    next()
    return
  }

  // Verificar se há credenciais na requisição
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger API Documentation"')
    res.status(401).json({
      error: 'Acesso não autorizado',
      message: 'Credenciais necessárias para acessar a documentação Swagger'
    })
    return
  }

  // Decodificar credenciais
  const base64Credentials = authHeader.split(' ')[1]
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
  const [username, password] = credentials.split(':')

  // Verificar credenciais
  if (username === swaggerUser && password === swaggerPassword) {
    next()
    return
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Swagger API Documentation"')
  res.status(401).json({
    error: 'Credenciais inválidas',
    message: 'Usuário ou senha incorretos'
  })
}

