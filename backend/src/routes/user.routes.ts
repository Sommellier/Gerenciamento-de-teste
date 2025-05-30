import { Router } from 'express'
import { registerUserController } from '../controllers/user.controller'
import { loginUserController } from  '../controllers/auth.controller'

const router = Router()

router.post('/register', (req, res, next) => {
  Promise.resolve(registerUserController(req, res)).catch(next)
})

router.post('/login', (req, res, next) => {
  Promise.resolve(loginUserController(req, res)).catch(next)
})

export default router
