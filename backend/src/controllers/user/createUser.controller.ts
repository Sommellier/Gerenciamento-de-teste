import { Request, Response } from 'express'
import { createUser } from '../../application/use-cases/user/createUser.use-case'
import { AppError } from '../../utils/AppError'

export async function registerUserController(req: Request, res: Response) {
  const { name, email, password } = req.body

  try {
    const user = await createUser({ name, email, password })
    return res.status(201).json(user)
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode : 400
    const errorMessage = err instanceof Error ? err.message : String(err)
    return res.status(status).json({ message: errorMessage })
  }
}

// está sendo usado