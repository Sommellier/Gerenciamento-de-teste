import { Request, Response } from 'express'
import { createUser } from '../application/use-cases/user/createUser.use-case'
import { loginUser } from '../application/use-cases/user/loginUser.use-case'
import { AppError } from '../utils/AppError'

export async function registerUserController(req: Request, res: Response) {
  const { name, email, password } = req.body

  try {
    const user = await createUser({ name, email, password })
    return res.status(201).json(user)
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode : 400
    const errorMessage = err instanceof Error ? err.message : String(err)
    return res.status(status).json({ error: errorMessage })
  }
}

export async function loginUserController(req: Request, res: Response) {
  const { email, password } = req.body

  try {
    const result = await loginUser({ email, password })
    return res.status(200).json(result)
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode : 401
    const errorMessage = err instanceof Error ? err.message : String(err)
    return res.status(status).json({ error: errorMessage })
  }
}
