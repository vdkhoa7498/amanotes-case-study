import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AppException, ErrorCode } from '../common/errors';
import { EmailService } from '../email/email.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LoginVerifyDto } from './dto/login-verify.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyRegisterDto } from './dto/verify-register.dto';
import { OtpService } from './otp.service';

export type GoogleProfile = {
  googleId: string;
  email: string;
  name?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeEmployeeCode(code: string): string {
    return code.trim();
  }

  private isTestAccount(email: string): boolean {
    return email.endsWith('@goodjob.local');
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);
    const employeeCode = this.normalizeEmployeeCode(dto.employeeCode);

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new AppException(
        ErrorCode.EMAIL_ALREADY_REGISTERED,
        'Email đã được đăng ký',
        HttpStatus.CONFLICT,
      );
    }

    const codeTaken = await this.usersService.findByEmployeeCode(employeeCode);
    if (codeTaken) {
      throw new AppException(
        ErrorCode.EMPLOYEE_CODE_TAKEN,
        'Mã nhân viên đã được sử dụng',
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.otpService.setPendingRegister(email, {
      passwordHash,
      fullName: dto.fullName.trim(),
      employeeCode,
      gender: dto.gender,
      dateOfBirth: dto.dateOfBirth,
      avatar: dto.avatar?.trim() || null,
    });
    const otp = this.otpService.generateCode();
    await this.otpService.saveOtp('register', email, otp);
    if (!this.isTestAccount(email)) {
      await this.emailService.sendOtp(email, 'Xác thực đăng ký', otp);
    }

    return { message: 'Đã gửi OTP tới email. Vui lòng kiểm tra hộp thư.' };
  }

  async verifyRegister(dto: VerifyRegisterDto): Promise<Tokens> {
    const email = this.normalizeEmail(dto.email);
    const pending = await this.otpService.getPendingRegister(email);
    if (!pending) {
      throw new AppException(
        ErrorCode.REGISTER_SESSION_EXPIRED,
        'Phiên đăng ký hết hạn hoặc không hợp lệ',
      );
    }

    const ok = await this.otpService.verifyOtp('register', email, dto.otp);
    if (!ok) {
      throw new AppException(
        ErrorCode.OTP_INVALID,
        'OTP không đúng hoặc đã hết hạn',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.usersService.create({
      email,
      passwordHash: pending.passwordHash,
      emailVerified: true,
      fullName: pending.fullName,
      employeeCode: pending.employeeCode,
      gender: pending.gender,
      dateOfBirth: new Date(pending.dateOfBirth.trim()),
      avatar: pending.avatar,
    });
    await this.otpService.deletePendingRegister(email);

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        'Email hoặc mật khẩu không đúng',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (!user.passwordHash) {
      throw new AppException(
        ErrorCode.GOOGLE_ONLY_ACCOUNT,
        'Tài khoản này đăng nhập bằng Google. Vui lòng dùng Google.',
      );
    }
    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) {
      throw new AppException(
        ErrorCode.INVALID_CREDENTIALS,
        'Email hoặc mật khẩu không đúng',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const otp = this.otpService.generateCode();
    await this.otpService.saveOtp('login', email, otp);
    if (!this.isTestAccount(email)) {
      await this.emailService.sendOtp(email, 'Xác thực đăng nhập', otp);
    }

    return { message: 'Đã gửi OTP tới email. Nhập mã để hoàn tất đăng nhập.' };
  }

  async verifyLogin(dto: LoginVerifyDto): Promise<Tokens> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new AppException(
        ErrorCode.ACCOUNT_NOT_FOUND,
        'Không tìm thấy tài khoản',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const ok = await this.otpService.verifyOtp('login', email, dto.otp);
    if (!ok) {
      throw new AppException(
        ErrorCode.OTP_INVALID,
        'OTP không đúng hoặc đã hết hạn',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.issueTokens(user);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new AppException(
        ErrorCode.USER_NOT_FOUND,
        'Không tìm thấy tài khoản với email này',
      );
    }
    if (!user.passwordHash) {
      throw new AppException(
        ErrorCode.GOOGLE_PASSWORD_NOT_SUPPORTED,
        'Tài khoản đăng nhập Google không dùng mật khẩu.',
      );
    }

    const otp = this.otpService.generateCode();
    await this.otpService.saveOtp('reset', email, otp);
    if (!this.isTestAccount(email)) {
      await this.emailService.sendOtp(email, 'Đặt lại mật khẩu', otp);
    }

    return { message: 'Đã gửi OTP tới email.' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new AppException(ErrorCode.RESET_INVALID, 'Không hợp lệ');
    }

    const ok = await this.otpService.verifyOtp('reset', email, dto.otp);
    if (!ok) {
      throw new AppException(
        ErrorCode.OTP_INVALID,
        'OTP không đúng hoặc đã hết hạn',
        HttpStatus.UNAUTHORIZED,
      );
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.usersService.save(user);

    return { message: 'Đã đổi mật khẩu thành công.' };
  }

  async refresh(refreshToken: string): Promise<Tokens> {
    const secret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    let payload: { sub: string; email: string; type?: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, { secret });
    } catch {
      throw new AppException(
        ErrorCode.REFRESH_TOKEN_INVALID,
        'Refresh token không hợp lệ',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (payload.type !== 'refresh') {
      throw new AppException(
        ErrorCode.REFRESH_TOKEN_INVALID,
        'Token không hợp lệ',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new AppException(
        ErrorCode.ACCOUNT_NOT_FOUND,
        'Người dùng không tồn tại',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.issueTokens(user);
  }

  /**
   * Google sign-in: only existing accounts (email already registered).
   * Links `googleId` on first Google login when the user signed up with email/password.
   */
  async loginWithGoogleProfile(profile: GoogleProfile): Promise<User> {
    const email = this.normalizeEmail(profile.email);

    const byGoogle = await this.usersService.findByGoogleId(profile.googleId);
    if (byGoogle) {
      return byGoogle;
    }

    const byEmail = await this.usersService.findByEmail(email);
    if (!byEmail) {
      throw new AppException(
        ErrorCode.GOOGLE_EMAIL_NOT_REGISTERED,
        'Email này chưa được đăng ký. Vui lòng đăng ký bằng email công ty trước.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (byEmail.googleId) {
      throw new AppException(
        ErrorCode.GOOGLE_EMAIL_LINKED_OTHER_GOOGLE,
        'Email đã liên kết tài khoản Google khác',
        HttpStatus.CONFLICT,
      );
    }

    byEmail.googleId = profile.googleId;
    await this.usersService.save(byEmail);
    return byEmail;
  }

  async issueTokens(user: User): Promise<Tokens> {
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, type: 'refresh' as const },
      { secret: refreshSecret, expiresIn: '7d' },
    );
    return { accessToken, refreshToken };
  }
}

export type Tokens = { accessToken: string; refreshToken: string };
