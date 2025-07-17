import { Request, Response } from 'express'
import { requestPasswordReset } from '../../application/use-cases/user/requestPasswordReset.use-case'
import { AppError } from '../../utils/AppError'

export async function forgotPasswordController(req: Request, res: Response) {
  const { email } = req.body

  try {
    await requestPasswordReset(email)
    return res.status(200).json({ message: 'E-mail de recuperação enviado com sucesso' })
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode : 400
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return res.status(status).json({ error: message })
  }
}
