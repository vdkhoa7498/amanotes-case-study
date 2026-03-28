import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { GoogleProfile } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const callback =
      configService.get<string>('GOOGLE_CALLBACK_URL') ??
      'http://localhost:7770/auth/google/callback';
    const id = configService.get<string>('GOOGLE_CLIENT_ID') ?? '';
    const secret = configService.get<string>('GOOGLE_CLIENT_SECRET') ?? '';
    super({
      clientID: id || 'unset-google-client-id',
      clientSecret: secret || 'unset-google-client-secret',
      callbackURL: callback,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Google account không có email'), undefined);
      return;
    }
    const payload: GoogleProfile = {
      googleId: profile.id,
      email,
      name: profile.displayName,
    };
    done(null, payload);
  }
}
