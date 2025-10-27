import { Role } from '@prisma/client'
import { sendEmail } from '../../../utils/email.util'

type Params = {
  to: string
  projectName: string
  role: Role
  token: string
}

function buildUrls(token: string) {
  const base = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '')
  return {
    acceptUrl: `${base}/invites/${token}/accept`,
    declineUrl: `${base}/invites/${token}/decline`,
  }
}

function buildHtml(projectName: string, role: Role, token: string) {
  const { acceptUrl, declineUrl } = buildUrls(token)
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto">
      <h2>Convite para participar do projeto ${projectName}</h2>
      <p>Você foi convidado como <b>${role}</b>.</p>
      <p>
        <a href="${acceptUrl}">Aceitar convite</a> |
        <a href="${declineUrl}">Recusar</a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
      <p style="color:#666;font-size:12px">
        Se você ainda não tem conta, crie uma no app e depois clique novamente em "Aceitar".
      </p>
    </div>
  `
}

export async function sendProjectInviteEmail({ to, projectName, role, token }: Params) {
  const subject = `[${projectName}] Convite para participar como ${role}`
  const html = buildHtml(projectName, role, token)
  await sendEmail(to, subject, html)
}
