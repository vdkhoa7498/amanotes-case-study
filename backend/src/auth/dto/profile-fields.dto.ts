import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Shared HR fields for email registration. */
export class ProfileFieldsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  employeeCode: string;

  @IsString()
  @IsIn(['male', 'female', 'other'])
  gender: string;

  @IsDateString()
  dateOfBirth: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatar?: string | null;
}
