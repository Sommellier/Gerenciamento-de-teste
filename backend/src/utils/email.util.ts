import nodemailer from 'nodemailer'

export async function sendEmail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASSWORD
    }
  })

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html
  })
}
