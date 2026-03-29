import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ user: User }>();
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Chỉ admin mới có quyền truy cập.');
    }
    return true;
  }
}
