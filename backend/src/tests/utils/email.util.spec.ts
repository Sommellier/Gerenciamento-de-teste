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

  it('não envia email quando EMAIL_FROM não está configurado', async () => {
    // Mock do console.warn para verificar se foi chamado
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    
    process.env = {
      ...OLD_ENV,
      EMAIL_FROM: undefined,
      EMAIL_PASSWORD: 'secret',
    }
    
    // Recarregar o módulo com as novas variáveis de ambiente
    delete require.cache[require.resolve(MODULE_PATH)]
    sendEmail = require(MODULE_PATH).sendEmail

    await sendEmail('user@ex.com', 'Assunto', '<b>Oi</b>')

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[email] EMAIL_FROM/EMAIL_PASSWORD não configurados; e-mail não será enviado'
    )
    expect(createTransportMock).not.toHaveBeenCalled()
    expect(sendMailMock).not.toHaveBeenCalled()
    
    consoleWarnSpy.mockRestore()
  })

  it('não envia email quando EMAIL_PASSWORD não está configurado', async () => {
    // Mock do console.warn para verificar se foi chamado
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    
    process.env = {
      ...OLD_ENV,
      EMAIL_FROM: 'tester@ex.com',
      EMAIL_PASSWORD: undefined,
    }
    
    // Recarregar o módulo com as novas variáveis de ambiente
    delete require.cache[require.resolve(MODULE_PATH)]
    sendEmail = require(MODULE_PATH).sendEmail

    await sendEmail('user@ex.com', 'Assunto', '<b>Oi</b>')

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[email] EMAIL_FROM/EMAIL_PASSWORD não configurados; e-mail não será enviado'
    )
    expect(createTransportMock).not.toHaveBeenCalled()
    expect(sendMailMock).not.toHaveBeenCalled()
    
    consoleWarnSpy.mockRestore()
  })

  it('não envia email quando ambos EMAIL_FROM e EMAIL_PASSWORD não estão configurados', async () => {
    // Mock do console.warn para verificar se foi chamado
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    
    process.env = {
      ...OLD_ENV,
      EMAIL_FROM: undefined,
      EMAIL_PASSWORD: undefined,
    }
    
    // Recarregar o módulo com as novas variáveis de ambiente
    delete require.cache[require.resolve(MODULE_PATH)]
    sendEmail = require(MODULE_PATH).sendEmail

    await sendEmail('user@ex.com', 'Assunto', '<b>Oi</b>')

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[email] EMAIL_FROM/EMAIL_PASSWORD não configurados; e-mail não será enviado'
    )
    expect(createTransportMock).not.toHaveBeenCalled()
    expect(sendMailMock).not.toHaveBeenCalled()
    
    consoleWarnSpy.mockRestore()
  })
})
