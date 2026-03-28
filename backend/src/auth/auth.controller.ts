import {
  Body,
  Controller,
  Get,
  Next,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import passport from 'passport';
import { User } from '../users/entities/user.entity';
import { AuthService, GoogleProfile } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LoginVerifyDto } from './dto/login-verify.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyRegisterDto } from './dto/verify-register.dto';
import { GoogleConfiguredGuard } from './google-config.guard';
import {
  buildGoogleLoginErrorUrl,
  googleCallbackErrorToLoginQuery,
} from './google-login-error';
import { GOOGLE_OAUTH_STATE_COOKIE } from './google-oauth.constants';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:7777';
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register/verify')
  verifyRegister(@Body() dto: VerifyRegisterDto) {
    return this.authService.verifyRegister(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login/verify')
  verifyLogin(@Body() dto: LoginVerifyDto) {
    return this.authService.verifyLogin(dto);
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('google')
  @UseGuards(GoogleConfiguredGuard)
  googleAuth(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    const googleAuth =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- passport
      passport.authenticate('google', {
        scope: ['email', 'profile'],
        session: false,
      }) as RequestHandler;
    googleAuth(req, res, next);
  }

  @Get('google/callback')
  @UseGuards(GoogleConfiguredGuard, AuthGuard('google'))
  async googleCallback(
    @Req() req: Request & { user: GoogleProfile },
    @Res() res: Response,
  ) {
    const base = this.frontendUrl().replace(/\/$/, '');
    const clearLegacyPrepareCookie = () =>
      res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, { path: '/' });

    try {
      const user = await this.authService.loginWithGoogleProfile(req.user);
      const tokens = await this.authService.issueTokens(user);
      const hash = new URLSearchParams({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      }).toString();
      clearLegacyPrepareCookie();
      return res.redirect(302, `${base}/auth/google/callback#${hash}`);
    } catch (e) {
      clearLegacyPrepareCookie();
      const { code, message } = googleCallbackErrorToLoginQuery(e);
      return res.redirect(302, buildGoogleLoginErrorUrl(base, code, message));
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: User }) {
    const u = req.user;
    return {
      id: u.id,
      email: u.email,
      emailVerified: u.emailVerified,
      hasPassword: !!u.passwordHash,
      hasGoogle: !!u.googleId,
      fullName: u.fullName,
      employeeCode: u.employeeCode,
      gender: u.gender,
      dateOfBirth: u.dateOfBirth
        ? u.dateOfBirth instanceof Date
          ? u.dateOfBirth.toISOString().slice(0, 10)
          : String(u.dateOfBirth).slice(0, 10)
        : null,
      avatar: u.avatar,
    };
  }
}
