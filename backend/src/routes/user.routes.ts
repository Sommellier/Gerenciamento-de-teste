import { Router } from 'express'
import { loginUserController, registerUserController } from '../controllers/user.controller'

const router = Router()

router.post('/register', (req, res, next) => {
  Promise.resolve(registerUserController(req, res)).catch(next)
})

router.post('/login', (req, res, next) => {
  Promise.resolve(loginUserController(req, res)).catch(next)
})

export default router
