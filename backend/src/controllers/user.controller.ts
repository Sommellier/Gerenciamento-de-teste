import { Request, Response } from 'express'
import { createUser } from '../application/use-cases/createUser.use-case'
import { loginUser } from '../application/use-cases/loginUser.use-case'

export async function registerUserController(req: Request, res: Response) {
  const { name, email, password } = req.body

  try {
    const user = await createUser({ name, email, password })
    return res.status(201).json(user)
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
}

export async function loginUserController(req: Request, res: Response) {
  const { email, password } = req.body

  try {
    const result = await loginUser({ email, password })
    return res.status(200).json(result)
  } catch (error: any) {
    return res.status(401).json({ error: error.message })
  }
}