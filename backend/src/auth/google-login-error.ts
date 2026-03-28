import { AppException } from '../common/errors';
import { ErrorCode, type ErrorCodeValue } from '../common/errors/error-codes';
import { defaultMessageForCode } from '../common/errors/default-messages';

export function buildGoogleLoginErrorUrl(
  frontendBase: string,
  code: ErrorCodeValue,
  message: string,
): string {
  const base = frontendBase.replace(/\/$/, '');
  const q = new URLSearchParams();
  q.set('google_error_code', code);
  q.set('google_error_message', message);
  return `${base}/login?${q.toString()}`;
}

/**
 * Maps errors from the Google callback (after Passport succeeds) to /login query params.
 */
export function googleCallbackErrorToLoginQuery(e: unknown): {
  code: ErrorCodeValue;
  message: string;
} {
  if (e instanceof AppException) {
    const p = AppException.payloadFrom(e);
    if (p) {
      return { code: p.code, message: p.message };
    }
  }

  if (e instanceof Error) {
    return {
      code: ErrorCode.GOOGLE_SIGN_IN_FAILED,
      message:
        e.message.trim() ||
        defaultMessageForCode(ErrorCode.GOOGLE_SIGN_IN_FAILED),
    };
  }

  return {
    code: ErrorCode.GOOGLE_SIGN_IN_FAILED,
    message: defaultMessageForCode(ErrorCode.GOOGLE_SIGN_IN_FAILED),
  };
}
