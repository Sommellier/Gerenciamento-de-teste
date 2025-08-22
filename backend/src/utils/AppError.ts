// src/utils/AppError.ts
export class AppError extends Error {
  public status: number
  public code?: string
  statusCode: any;

  constructor(
    message: string,
    status = 400,
    opts?: { code?: string; cause?: unknown }
  ) {
    super(message)
    this.name = 'AppError'
    this.status = status
    if (opts?.code) this.code = opts.code
    if (opts?.cause) (this as any).cause = opts.cause

    // mantém stacktrace limpo
    Error.captureStackTrace?.(this, AppError)
  }
}
