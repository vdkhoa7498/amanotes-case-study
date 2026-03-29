import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { CreateKudoDto } from './dto/create-kudo.dto';
import { KudoFeedQueryDto } from './dto/feed-query.dto';
import { KudosService } from './kudos.service';

@Controller('kudos')
@UseGuards(JwtAuthGuard)
export class KudosController {
  constructor(private readonly kudos: KudosService) {}

  @Post()
  create(@Req() req: { user: User }, @Body() dto: CreateKudoDto) {
    return this.kudos.createKudo(req.user, dto);
  }

  @Get('core-values')
  listCoreValues() {
    return this.kudos.listCoreValues();
  }

  @Get('feed')
  feed(@Req() req: { user: User }, @Query() q: KudoFeedQueryDto) {
    return this.kudos.getFeed(req.user.id, q);
  }
}
