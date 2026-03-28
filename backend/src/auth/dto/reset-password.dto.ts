import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6, { message: 'OTP gồm 6 chữ số' })
  otp: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  newPassword: string;
}
