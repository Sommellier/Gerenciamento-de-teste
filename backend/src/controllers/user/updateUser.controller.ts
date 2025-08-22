import { Request, Response } from 'express'
import { updateUser } from '../../application/use-cases/user/updateUser.use-case'
import { AppError } from '../../utils/AppError'

export async function updateUserController(req: Request, res: Response) {
  const userId = req.params.id
  const { name, email, password } = req.body

  try {
    const updatedUser = await updateUser(userId, { name, email, password })
    return res.status(200).json(updatedUser)
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode : 400
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return res.status(status).json({ error: message })
  }
}

