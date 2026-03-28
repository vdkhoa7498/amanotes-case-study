import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6, { message: 'OTP gồm 6 chữ số' })
  otp: string;
}
