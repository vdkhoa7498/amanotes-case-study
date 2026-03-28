import { ErrorCode, type ErrorCodeValue } from './error-codes';

/** Default user-facing messages (Vietnamese) keyed by error code. */
export const defaultErrorMessages: Record<ErrorCodeValue, string> = {
  [ErrorCode.VALIDATION_FAILED]: 'Dữ liệu không hợp lệ.',
  [ErrorCode.UNAUTHORIZED]: 'Không được phép truy cập.',
  [ErrorCode.BAD_REQUEST]: 'Yêu cầu không hợp lệ.',
  [ErrorCode.INTERNAL_ERROR]: 'Lỗi máy chủ. Vui lòng thử lại sau.',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Dịch vụ tạm thời không khả dụng.',

  [ErrorCode.EMAIL_ALREADY_REGISTERED]: 'Email đã được đăng ký.',
  [ErrorCode.EMPLOYEE_CODE_TAKEN]: 'Mã nhân viên đã được sử dụng.',
  [ErrorCode.REGISTER_SESSION_EXPIRED]:
    'Phiên đăng ký hết hạn hoặc không hợp lệ.',
  [ErrorCode.OTP_INVALID]: 'OTP không đúng hoặc đã hết hạn.',
  [ErrorCode.INVALID_CREDENTIALS]: 'Email hoặc mật khẩu không đúng.',
  [ErrorCode.GOOGLE_ONLY_ACCOUNT]:
    'Tài khoản này đăng nhập bằng Google. Vui lòng dùng Google.',
  [ErrorCode.USER_NOT_FOUND]: 'Không tìm thấy tài khoản với email này.',
  [ErrorCode.GOOGLE_PASSWORD_NOT_SUPPORTED]:
    'Tài khoản đăng nhập Google không dùng mật khẩu.',
  [ErrorCode.RESET_INVALID]: 'Không hợp lệ.',
  [ErrorCode.REFRESH_TOKEN_INVALID]: 'Refresh token không hợp lệ.',
  [ErrorCode.ACCOUNT_NOT_FOUND]: 'Không tìm thấy tài khoản.',

  [ErrorCode.GOOGLE_NOT_CONFIGURED]:
    'Đăng nhập Google chưa được cấu hình. Thêm GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET vào .env.',
  [ErrorCode.GOOGLE_SIGN_IN_FAILED]: 'Đăng nhập Google thất bại. Thử lại.',
  [ErrorCode.GOOGLE_EMAIL_LINKED_OTHER_GOOGLE]:
    'Email đã liên kết tài khoản Google khác.',
  [ErrorCode.GOOGLE_EMAIL_NOT_REGISTERED]:
    'Email này chưa được đăng ký. Vui lòng đăng ký bằng email công ty trước.',
};

export function defaultMessageForCode(code: ErrorCodeValue): string {
  return defaultErrorMessages[code];
}
