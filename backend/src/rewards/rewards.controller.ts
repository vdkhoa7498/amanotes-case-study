import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { RewardsService } from './rewards.service';

@Controller('rewards')
@UseGuards(JwtAuthGuard)
export class RewardsController {
  constructor(private readonly rewards: RewardsService) {}

  @Get('catalog')
  catalog() {
    return this.rewards.listCatalog();
  }

  @Post('redeem')
  redeem(@Req() req: { user: User }, @Body() dto: RedeemRewardDto) {
    return this.rewards.redeem(req.user.id, dto);
  }
}
