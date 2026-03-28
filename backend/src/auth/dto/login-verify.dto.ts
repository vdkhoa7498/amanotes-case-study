import { IsEmail, IsString, Length } from 'class-validator';

export class LoginVerifyDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6, { message: 'OTP gồm 6 chữ số' })
  otp: string;
}
