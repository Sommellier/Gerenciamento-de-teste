import 'dotenv/config'
import { beforeEach, afterAll, describe, expect, it, jest } from '@jest/globals'
import { prisma } from '../../../infrastructure/prisma'
import { sendProjectInviteEmail } from '../../../application/use-cases/invitations/email.service'
import { Role } from '@prisma/client'

// Mock explícito do util que envia e-mail de fato
jest.mock('../../../utils/email.util', () => ({
  sendEmail: jest.fn(async (_to: string, _subject: string, _html: string) => {}),
}))
import { sendEmail } from '../../../utils/email.util'

// helper
const unique = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`

beforeEach(async () => {
  jest.clearAllMocks()

  // limpa base (não usamos o DB aqui, mas mantém o padrão do repo)
  await prisma.passwordResetToken.deleteMany()
  await prisma.evidence.deleteMany()
  await prisma.execution.deleteMany()
  await prisma.userOnProject.deleteMany()
  await prisma.projectInvite.deleteMany()
  await prisma.testCase.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('email.service - sendProjectInviteEmail', () => {
  it('usa APP_URL default quando undefined e monta links corretos', async () => {
    const prev = process.env.APP_URL
    delete process.env.APP_URL
    try {
      const to = `${unique('user')}@example.com`
      const projectName = 'Meu Projeto'
      const role: Role = 'TESTER'
      const token = 'abc123token'

      await sendProjectInviteEmail({ to, projectName, role, token })

      expect(sendEmail).toHaveBeenCalledTimes(1)
      const [calledTo, subject, html] = (sendEmail as jest.Mock).mock.calls[0]

      // destinatário
      expect(calledTo).toBe(to)

      // assunto
      expect(subject).toBe(`[${projectName}] Convite para participar como ${role}`)

      // html contém as URLs com base default
      const accept = `http://localhost:5173/invites/${token}/accept`
      const decline = `http://localhost:5173/invites/${token}/decline`
      expect(html).toContain(accept)
      expect(html).toContain(decline)

      // html contém projectName e role
      expect(html).toContain(projectName)
      expect(html).toContain(role)
    } finally {
      if (prev === undefined) delete process.env.APP_URL
      else process.env.APP_URL = prev
    }
  })

  it('remove barras finais do APP_URL e monta accept/decline corretamente', async () => {
    const prev = process.env.APP_URL
    process.env.APP_URL = 'https://front.example.com///'
    try {
      const to = `${unique('user2')}@example.com`
      const projectName = 'Projeto-X'
      const role: Role = 'APPROVER'
      const token = 'tokXYZ'

      await sendProjectInviteEmail({ to, projectName, role, token })

      expect(sendEmail).toHaveBeenCalledTimes(1)
      const [_to, subject, html] = (sendEmail as jest.Mock).mock.calls[0]

      expect(subject).toBe(`[${projectName}] Convite para participar como ${role}`)

      // sem barras duplas no meio
      const accept = `https://front.example.com/invites/${token}/accept`
      const decline = `https://front.example.com/invites/${token}/decline`
      expect(html).toContain(accept)
      expect(html).toContain(decline)

      // âncoras de texto corretas
      expect(html).toContain(`>Aceitar convite<`)
      expect(html).toContain(`>Recusar<`)
    } finally {
      process.env.APP_URL = prev
    }
  })
})
