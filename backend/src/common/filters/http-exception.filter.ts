import {
  type ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';
import { AppException, ErrorCode, type ErrorCodeValue } from '../errors';
import { defaultErrorMessages } from '../errors/default-messages';

function extractNestMessage(body: string | object): string {
  if (typeof body === 'string') return body;
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.join(', ');
  }
  return 'Request failed';
}

function fallbackCodeForStatus(status: number): ErrorCodeValue {
  const code = Number(status);
  if (code === 401) return ErrorCode.UNAUTHORIZED;
  if (code === 403) return ErrorCode.UNAUTHORIZED;
  if (code === 404) return ErrorCode.BAD_REQUEST;
  if (code === 409) return ErrorCode.BAD_REQUEST;
  if (code === 429) return ErrorCode.RATE_LIMIT_EXCEEDED;
  if (code === 503) return ErrorCode.SERVICE_UNAVAILABLE;
  return ErrorCode.BAD_REQUEST;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (exception instanceof ThrottlerException || status === 429) {
        response.status(HttpStatus.TOO_MANY_REQUESTS).json({
          success: false,
          error: {
            code: ErrorCode.RATE_LIMIT_EXCEEDED,
            message: extractNestMessage(body),
            details: {},
          },
        });
        return;
      }

      const structured = AppException.payloadFrom(exception);
      if (structured) {
        response.status(status).json({
          success: false,
          error: structured,
        });
        return;
      }

      if (
        Number(status) === 400 &&
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        Array.isArray((body as { message: unknown }).message)
      ) {
        const fields = (body as { message: string[] }).message;
        response.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_FAILED,
            message: defaultErrorMessages[ErrorCode.VALIDATION_FAILED],
            details: { fields },
          },
        });
        return;
      }

      const message = extractNestMessage(body);
      response.status(status).json({
        success: false,
        error: {
          code: fallbackCodeForStatus(status),
          message,
          details: {},
        },
      });
      return;
    }

    const err =
      exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(err.stack ?? err.message);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message:
          process.env.NODE_ENV === 'production'
            ? defaultErrorMessages[ErrorCode.INTERNAL_ERROR]
            : err.message,
        details: {},
      },
    });
  }
}
