// src/tests/utils/email.util.spec.ts
import path from 'path'

// ---- Mocks do nodemailer ----
const sendMailMock = jest.fn()
const createTransportMock = jest.fn().mockReturnValue({ sendMail: sendMailMock })

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: createTransportMock },
}))
// -----------------------------

describe('sendEmail util', () => {
  // AJUSTE este caminho caso seu arquivo esteja em outra pasta
  const MODULE_PATH = path.resolve(__dirname, '../../utils/email.util')

  const OLD_ENV = process.env
  let sendEmail: (to: string, subject: string, html: string) => Promise<void>

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...OLD_ENV,
      EMAIL_FROM: 'tester@ex.com',
      EMAIL_PASSWORD: 'secret',
    }
    // carrega após os mocks estarem ativos
    sendEmail = require(MODULE_PATH).sendEmail
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('cria transporter gmail com credenciais do env e envia email', async () => {
    sendMailMock.mockResolvedValueOnce({ messageId: 'abc' })

    await sendEmail('user@ex.com', 'Assunto', '<b>Oi</b>')

    expect(createTransportMock).toHaveBeenCalledWith({
      service: 'gmail',
      auth: { user: 'tester@ex.com', pass: 'secret' },
    })

    expect(sendMailMock).toHaveBeenCalledWith({
      from: 'tester@ex.com',
      to: 'user@ex.com',
      subject: 'Assunto',
      html: '<b>Oi</b>',
    })
  })

  it('propaga erro quando transporter.sendMail rejeita', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('smtp down'))

    await expect(
      sendEmail('user@ex.com', 'X', '<p></p>')
    ).rejects.toThrow('smtp down')
  })

  it('propaga erro quando createTransport lança', async () => {
    createTransportMock.mockImplementationOnce(() => {
      throw new Error('bad cfg')
    })

    await expect(
      sendEmail('user@ex.com', 'Y', '<p></p>')
    ).rejects.toThrow('bad cfg')
  })
})
