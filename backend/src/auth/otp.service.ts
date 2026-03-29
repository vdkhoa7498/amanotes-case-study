import { Injectable } from '@nestjs/common';
import { randomInt, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

const OTP_TTL_SEC = 600;
const OTP_PREFIX = {
  register: 'otp:register:',
  login: 'otp:login:',
  reset: 'otp:reset:',
} as const;

const PENDING_REGISTER = 'pending_register:';

export type PendingRegisterData = {
  passwordHash: string;
  fullName: string;
  employeeCode: string;
  gender: string;
  dateOfBirth: string;
  avatar: string | null;
};

@Injectable()
export class OtpService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  generateCode(): string {
    return String(randomInt(100_000, 1_000_000));
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async saveOtp(
    kind: keyof typeof OTP_PREFIX,
    email: string,
    code: string,
  ): Promise<void> {
    const key = OTP_PREFIX[kind] + this.normalizeEmail(email);
    await this.redis.setex(key, OTP_TTL_SEC, code);
  }

  async verifyOtp(
    kind: keyof typeof OTP_PREFIX,
    email: string,
    code: string,
  ): Promise<boolean> {
    const masterCode = this.config.get<string>('OTP_MASTER_CODE', '');
    if (masterCode && code.trim() === masterCode) return true;

    const key = OTP_PREFIX[kind] + this.normalizeEmail(email);
    const stored = await this.redis.get(key);
    if (!stored) return false;
    const a = Buffer.from(stored, 'utf8');
    const b = Buffer.from(code.trim(), 'utf8');
    if (a.length !== b.length) return false;
    const ok = timingSafeEqual(a, b);
    if (ok) await this.redis.del(key);
    return ok;
  }

  async deleteOtp(kind: keyof typeof OTP_PREFIX, email: string): Promise<void> {
    const key = OTP_PREFIX[kind] + this.normalizeEmail(email);
    await this.redis.del(key);
  }

  async setPendingRegister(
    email: string,
    data: PendingRegisterData,
  ): Promise<void> {
    const key = PENDING_REGISTER + this.normalizeEmail(email);
    await this.redis.setex(key, OTP_TTL_SEC, JSON.stringify(data));
  }

  async getPendingRegister(email: string): Promise<PendingRegisterData | null> {
    const key = PENDING_REGISTER + this.normalizeEmail(email);
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PendingRegisterData;
    } catch {
      return null;
    }
  }

  async deletePendingRegister(email: string): Promise<void> {
    const key = PENDING_REGISTER + this.normalizeEmail(email);
    await this.redis.del(key);
  }
}
