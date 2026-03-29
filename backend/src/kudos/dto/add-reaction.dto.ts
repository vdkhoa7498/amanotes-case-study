import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddReactionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  emoji: string;
}
