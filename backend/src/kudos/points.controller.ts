import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { PointsService } from './points.service';

@Controller('points')
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private readonly points: PointsService) {}

  /** Balance, lifetime received/given from kudos, monthly giving budget. */
  @Get('me/summary')
  getMySummary(@Req() req: { user: User }) {
    return this.points.getSummaryForUser(req.user.id);
  }
}
