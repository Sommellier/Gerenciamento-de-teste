import { Router } from 'express'
import { registerUserController } from '../controllers/user/createUser.controller'
import { loginUserController } from  '../controllers/user/loginUser.controller'
import { deleteUserController } from '../controllers/user/deleteUser.controller'
import { updateUserController } from '../controllers/user/updateUser.controller'
import { forgotPasswordController } from '../controllers/user/requestPasswordReset.controller'
import { resetPasswordController } from '../controllers/user/resetPassword.controller'
import { loginLimiter, registerLimiter, passwordResetLimiter, userLimiter } from '../infrastructure/rateLimiter'
import auth from '../infrastructure/auth'

const router = Router()

router.post('/register', registerLimiter, (req, res, next) => {
  Promise.resolve(registerUserController(req, res)).catch(next)
})

router.post('/login', loginLimiter, (req, res, next) => {
  Promise.resolve(loginUserController(req, res)).catch(next)
})

// Rotas que requerem autenticação e têm limite por usuário
router.delete('/users/:id', auth, userLimiter, (req, res, next) => {
  Promise.resolve(deleteUserController(req, res)).catch(next)
})

router.put('/users/:id', auth, userLimiter, (req, res, next) => {
  Promise.resolve(updateUserController(req, res)).catch(next)
})

// Recuperação de senha com limite específico por email
router.post('/request-password-reset', passwordResetLimiter, (req, res, next) => {
  Promise.resolve(forgotPasswordController(req, res)).catch(next)
})

router.post('/reset-password', (req, res, next) => {
  Promise.resolve(resetPasswordController(req, res)).catch(next)
})

export default router
