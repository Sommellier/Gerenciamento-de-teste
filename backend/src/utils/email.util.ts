import nodemailer from 'nodemailer'
import { logger } from './logger'

export async function sendEmail(to: string, subject: string, html: string) {
  const user = process.env.EMAIL_FROM
  const pass = process.env.EMAIL_PASSWORD
  if (!user || !pass) {
    // em dev, loga claramente o problema para facilitar diagnóstico
    logger.warn('[email] EMAIL_FROM/EMAIL_PASSWORD não configurados; e-mail não será enviado')
    return
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    }
  })

  await transporter.sendMail({
    from: user,
    to,
    subject,
    html
  })
}
