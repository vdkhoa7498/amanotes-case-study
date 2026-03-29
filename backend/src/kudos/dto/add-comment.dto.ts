import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AddCommentDto {
  /** Nội dung HTML (React Quill); sẽ được lưu nguyên — client nên sanitize. */
  @IsString()
  @MinLength(1)
  @MaxLength(24_000)
  body: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  mediaKeys?: string[];
}
