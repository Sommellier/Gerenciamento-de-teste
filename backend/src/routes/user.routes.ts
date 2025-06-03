import { Router } from 'express'
import { registerUserController } from '../controllers/user.controller'
import { loginUserController } from  '../controllers/auth.controller'
import { deleteUserController } from '../controllers/deleteUser.controller'
import { updateUserController } from '../controllers/updateUser.controller'

const router = Router()

router.post('/register', (req, res, next) => {
  Promise.resolve(registerUserController(req, res)).catch(next)
})

router.post('/login', (req, res, next) => {
  Promise.resolve(loginUserController(req, res)).catch(next)
})

router.delete('/users/:id', (req, res, next) => {
  Promise.resolve(deleteUserController(req, res)).catch(next)
})

router.put('/users/:id', (req, res, next) => {
  Promise.resolve(updateUserController(req, res)).catch(next)
})

export default router
