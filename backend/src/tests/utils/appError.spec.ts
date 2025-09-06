import path from 'path'

function loadAppError() {
    const candidates = [
        '../../errors/AppError',
        '../../utils/AppError',
        '../../shared/errors/AppError',
        '../../application/errors/AppError',
        '../../domain/errors/AppError',
        '../../core/errors/AppError',
    ].map(p => path.resolve(__dirname, p))

    const errors: string[] = []

    for (const candidate of candidates) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const mod = require(candidate)
            if (mod?.AppError) return mod.AppError
        } catch (e: any) {
            errors.push(`${candidate}: ${String(e?.message || e).split('\n')[0]}`)
        }
    }

    throw new Error(
        `Não encontrei o módulo 'AppError'. Ajuste o caminho no teste.\n` +
        `Tentativas:\n- ${errors.join('\n- ')}`
    )
}

describe('AppError', () => {
    let AppError: any

    beforeEach(() => {
        jest.resetModules()
        AppError = loadAppError()
    })

    it('cria com defaults corretos (status 400) e mantém a mensagem', () => {
        const err = new AppError('Falhou geral')

        expect(err).toBeInstanceOf(Error)
        expect(err).toBeInstanceOf(AppError)
        expect(err.name).toBe('AppError')
        expect(err.message).toBe('Falhou geral')
        expect(err.statusCode).toBe(400)
        expect(err.status).toBe(400) // compat
        expect(err.code).toBeUndefined()
        expect(String(err.stack || '')).toMatch(/AppError|at /)
    })

    it('aceita status customizado e code', () => {
        const err = new AppError('Não autorizado', 401, { code: 'NOT_AUTH' })

        expect(err.statusCode).toBe(401)
        expect(err.status).toBe(401)
        expect(err.code).toBe('NOT_AUTH')
    })

    it('propaga o cause quando fornecido', () => {
        const root = new Error('raiz')
        const err = new AppError('Algo deu ruim', 500, { cause: root })
        expect((err as any).cause).toBe(root)
    })

    it('chama Error.captureStackTrace quando disponível', () => {
        const original = (Error as any).captureStackTrace
        const spy = jest.fn()
            ; (Error as any).captureStackTrace = spy

        const instance = new AppError('Stack pls')
        expect(spy).toHaveBeenCalledWith(instance, AppError)

            ; (Error as any).captureStackTrace = original
    })

    it('funciona em try/catch preservando propriedades', () => {
        try {
            throw new AppError('Entrada inválida', 422, { code: 'E_INVALID' })
        } catch (e: any) {
            expect(e).toBeInstanceOf(AppError)
            expect(e.message).toBe('Entrada inválida')
            expect(e.statusCode).toBe(422)
            expect(e.status).toBe(422)
            expect(e.code).toBe('E_INVALID')
        }
    })
    it('cobre a linha 17: chama Error.captureStackTrace(this, AppError)', () => {
        const original = (Error as any).captureStackTrace
        const spy = jest.fn()
            ; (Error as any).captureStackTrace = spy

        const err = new AppError('stack pls') // executa a linha 17

        expect(spy).toHaveBeenCalledTimes(1)
        const [inst, ctor] = spy.mock.calls[0]
        expect(inst).toBe(err)
        expect(ctor).toBe(AppError)

            ; (Error as any).captureStackTrace = original
    })

    it('não quebra quando captureStackTrace não existe (branch do ?. não chamado)', () => {
        const original = (Error as any).captureStackTrace
            ; (Error as any).captureStackTrace = undefined

        expect(() => new AppError('sem capture')).not.toThrow()

            ; (Error as any).captureStackTrace = original
    })
})
