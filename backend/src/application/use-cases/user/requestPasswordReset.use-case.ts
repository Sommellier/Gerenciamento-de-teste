import { prisma } from '../../../infrastructure/prisma'
import { AppError } from '../../../utils/AppError'
import { sendEmail } from '../../../utils/email.util'
import crypto from 'crypto'

export async function requestPasswordReset(email: string) {
  if (!email) {
    throw new AppError('Email is required', 400)
  }

  const normalizedEmail = email.trim().toLowerCase()

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  })

  if (!user) {
    throw new AppError('User with this email does not exist', 404)
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: expires
    }
  })

  // Usar hash (#) na URL ao invés de query string para não expor token em logs/referrers
  // O hash não é enviado ao servidor, então é mais seguro
  const resetLink = `${process.env.FRONTEND_URL}/reset-password#token=${token}`

  const subject = 'Redefinição de Senha'
  const body = `
    <p>Olá, ${user.name}.</p>
    <p>Você solicitou uma redefinição de senha.</p>
    <p><a href="${resetLink}">Clique aqui para redefinir sua senha</a></p>
    <p>Esse link é válido por 1 hora.</p>
  `

  await sendEmail(user.email, subject, body)
}
