import { Request, Response } from 'express'
import { resetPassword } from '../../application/use-cases/user/resetPassword.use-case'
import { AppError } from '../../utils/AppError'

export async function resetPasswordController(req: Request, res: Response) {
  const { token, newPassword } = req.body

  try {
    await resetPassword(token, newPassword)
    return res.status(200).json({ message: 'Senha redefinida com sucesso' })
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode : 400
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return res.status(status).json({ error: message })
  }
}
