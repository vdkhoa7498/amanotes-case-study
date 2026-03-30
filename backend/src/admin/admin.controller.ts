import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CoreValue } from '../kudos/entities/core-value.entity';
import { RewardCatalogItem } from '../rewards/entities/reward-catalog-item.entity';
import { UpsertCoreValueDto } from './dto/upsert-core-value.dto';
import { UpsertRewardDto } from './dto/upsert-reward.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    @InjectRepository(RewardCatalogItem)
    private readonly rewardsRepo: Repository<RewardCatalogItem>,
    @InjectRepository(CoreValue)
    private readonly coreValuesRepo: Repository<CoreValue>,
  ) {}

  // ── Reward Catalog ─────────────────────────────────────────────────────────

  @Get('rewards')
  listRewards() {
    return this.rewardsRepo.find({
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  @Post('rewards')
  createReward(@Body() dto: UpsertRewardDto) {
    const item = this.rewardsRepo.create({
      ...dto,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      stock: dto.stock ?? null,
    });
    return this.rewardsRepo.save(item);
  }

  @Patch('rewards/:id')
  async updateReward(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertRewardDto,
  ) {
    const item = await this.rewardsRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy phần thưởng');
    Object.assign(item, dto);
    return this.rewardsRepo.save(item);
  }

  @Delete('rewards/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReward(@Param('id', ParseUUIDPipe) id: string) {
    const item = await this.rewardsRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy phần thưởng');
    try {
      await this.rewardsRepo.remove(item);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('reward_redemptions_reward_item_id_fkey')) {
        throw new BadRequestException(
          'Không thể xoá phần thưởng này vì đã có người đổi thưởng.',
        );
      }
      throw err;
    }
  }

  // ── Core Values ────────────────────────────────────────────────────────────

  @Get('core-values')
  listCoreValues() {
    return this.coreValuesRepo.find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  @Post('core-values')
  createCoreValue(@Body() dto: UpsertCoreValueDto) {
    const cv = this.coreValuesRepo.create({
      ...dto,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.coreValuesRepo.save(cv);
  }

  @Patch('core-values/:id')
  async updateCoreValue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertCoreValueDto,
  ) {
    const cv = await this.coreValuesRepo.findOne({ where: { id } });
    if (!cv) throw new NotFoundException('Không tìm thấy core value');
    Object.assign(cv, dto);
    return this.coreValuesRepo.save(cv);
  }

  @Delete('core-values/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCoreValue(@Param('id', ParseUUIDPipe) id: string) {
    const cv = await this.coreValuesRepo.findOne({ where: { id } });
    if (!cv) throw new NotFoundException('Không tìm thấy core value');
    try {
      await this.coreValuesRepo.remove(cv);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('kudos_core_value_id_fkey')) {
        throw new BadRequestException(
          'Không thể xoá giá trị cốt lõi này vì đã có kudo sử dụng.',
        );
      }
      throw err;
    }
  }
}
