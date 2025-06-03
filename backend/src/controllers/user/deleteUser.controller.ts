import { Request, Response } from 'express'
import { deleteUser } from '../../application/use-cases/user/deleteUser.use-case'
import { AppError } from '../../utils/AppError'

export async function deleteUserController(req: Request, res: Response) {
  const { id } = req.params

  try {
    await deleteUser(id)
    return res.status(204).send()
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode : 400
    const message = err instanceof Error ? err.message : String(err)
    return res.status(status).json({ error: message })
  }
}
