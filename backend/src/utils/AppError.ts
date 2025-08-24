export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: number; // compat
  public readonly code?: string;

  constructor(
    message: string,
    status = 400,
    opts?: { code?: string; cause?: unknown }
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = status;
    this.status = status; // compat com lugares que ainda leem .status
    if (opts?.code) this.code = opts.code;
    if (opts?.cause) (this as any).cause = opts.cause;
    Error.captureStackTrace?.(this, AppError);
  }
}