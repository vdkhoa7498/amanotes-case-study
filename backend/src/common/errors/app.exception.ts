import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCodeValue } from './error-codes';

export type AppErrorPayload = {
  code: ErrorCodeValue;
  message: string;
  details: Record<string, unknown>;
};

/** Thrown from services/guards; the global filter maps this to `{ success: false, error }`. */
export class AppException extends HttpException {
  constructor(
    code: ErrorCodeValue,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details: Record<string, unknown> = {},
  ) {
    const payload: AppErrorPayload = { code, message, details };
    super(payload, status);
  }

  static payloadFrom(exception: HttpException): AppErrorPayload | null {
    const body = exception.getResponse();
    if (!isAppErrorPayload(body)) return null;
    return {
      code: body.code,
      message: body.message,
      details: body.details ?? {},
    };
  }
}

export function isAppErrorPayload(
  body: string | object,
): body is AppErrorPayload {
  if (typeof body !== 'object' || body === null) return false;
  if (!('code' in body) || !('message' in body)) return false;
  const o = body as Record<string, unknown>;
  return typeof o.code === 'string' && typeof o.message === 'string';
}
