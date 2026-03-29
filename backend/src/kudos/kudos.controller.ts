import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { AddCommentDto } from './dto/add-comment.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { CreateKudoDto } from './dto/create-kudo.dto';
import { KudoFeedQueryDto } from './dto/feed-query.dto';
import { ReceivedShoutoutsQueryDto } from './dto/received-shoutouts-query.dto';
import { KudosService } from './kudos.service';

@Controller('kudos')
@UseGuards(JwtAuthGuard)
export class KudosController {
  constructor(
    private readonly kudos: KudosService,
    private readonly ai: AiService,
  ) {}

  @Post()
  create(@Req() req: { user: User }, @Body() dto: CreateKudoDto) {
    return this.kudos.createKudo(req.user, dto);
  }

  @Get('ai-summary')
  aiSummary(@Req() req: { user: User }) {
    return this.ai.generateMonthlySummary(req.user.id);
  }

  @Get('ai-search')
  aiSearch(@Query('q') q: string) {
    if (!q?.trim()) throw new BadRequestException('Query param "q" is required');
    return this.ai.searchKudos(q.trim());
  }

  @Get('ranking/monthly')
  monthlyRanking() {
    return this.kudos.getMonthlyReceivedRanking();
  }

  @Get('core-values')
  listCoreValues() {
    return this.kudos.listCoreValues();
  }

  @Get('feed')
  feed(@Req() req: { user: User }, @Query() q: KudoFeedQueryDto) {
    return this.kudos.getFeed(req.user.id, q);
  }

  @Get('received-shoutouts')
  receivedShoutouts(@Req() req: { user: User }, @Query() q: ReceivedShoutoutsQueryDto) {
    return this.kudos.listReceivedShoutouts(req.user.id, q);
  }

  @Get(':kudoId')
  getOne(@Req() req: { user: User }, @Param('kudoId', ParseUUIDPipe) kudoId: string) {
    return this.kudos.getKudoDetail(req.user.id, kudoId);
  }

  @Post(':kudoId/reactions')
  addReaction(
    @Req() req: { user: User },
    @Param('kudoId', ParseUUIDPipe) kudoId: string,
    @Body() dto: AddReactionDto,
  ) {
    return this.kudos.setReaction(req.user, kudoId, dto.emoji);
  }

  @Delete(':kudoId/reactions')
  removeReaction(@Req() req: { user: User }, @Param('kudoId', ParseUUIDPipe) kudoId: string) {
    return this.kudos.removeReaction(req.user, kudoId);
  }

  @Post(':kudoId/comments')
  addComment(
    @Req() req: { user: User },
    @Param('kudoId', ParseUUIDPipe) kudoId: string,
    @Body() dto: AddCommentDto,
  ) {
    return this.kudos.addComment(req.user, kudoId, dto);
  }
}
