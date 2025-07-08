import { Router } from 'express'
import { registerUserController } from '../controllers/user/createUser.controller'
import { loginUserController } from  '../controllers/user/loginUser.controller'
import { deleteUserController } from '../controllers/user/deleteUser.controller'
import { updateUserController } from '../controllers/user/updateUser.controller'
import { forgotPasswordController } from '../controllers/user/requestPasswordReset.controller'
import { resetPasswordController } from '../controllers/user/resetPassword.controller'

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

router.post('/request-password-reset', (req, res, next) => {
  Promise.resolve(forgotPasswordController(req, res)).catch(next)
})

router.post('/reset-password', (req, res, next) => {
  Promise.resolve(resetPasswordController(req, res)).catch(next)
})

export default router
