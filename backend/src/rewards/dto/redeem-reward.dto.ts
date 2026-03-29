import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RedeemRewardDto {
  @IsUUID()
  rewardItemId: string;

  /** Idempotency; server generates if omitted. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  idempotencyKey?: string;
}
