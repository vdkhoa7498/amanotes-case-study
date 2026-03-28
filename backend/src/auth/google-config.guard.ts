import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException, ErrorCode } from '../common/errors';

/** Blocks /auth/google when OAuth env is missing (avoids confusing redirects). */
@Injectable()
export class GoogleConfiguredGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    void context;
    const id = this.config.get<string>('GOOGLE_CLIENT_ID')?.trim();
    const secret = this.config.get<string>('GOOGLE_CLIENT_SECRET')?.trim();
    if (!id || !secret) {
      throw new AppException(
        ErrorCode.GOOGLE_NOT_CONFIGURED,
        'Đăng nhập Google chưa được cấu hình. Thêm GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET vào .env.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return true;
  }
}
