import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class KudoRecipientInputDto {
  @IsUUID()
  userId: string;

  @IsInt()
  @Min(10)
  @Max(50)
  points: number;
}

export class CreateKudoDto {
  @IsUUID()
  coreValueId: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => KudoRecipientInputDto)
  recipients: KudoRecipientInputDto[];
}
