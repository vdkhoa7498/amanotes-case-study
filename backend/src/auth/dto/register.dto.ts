import { IsEmail, IsString, MinLength } from 'class-validator';
import { ProfileFieldsDto } from './profile-fields.dto';

export class RegisterDto extends ProfileFieldsDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  password: string;
}
