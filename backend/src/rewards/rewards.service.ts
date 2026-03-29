import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { AppException } from '../common/errors';
import { ErrorCode } from '../common/errors/error-codes';
import { PointLedgerEntryType } from '../kudos/constants/kudo.constants';
import { PointLedger } from '../kudos/entities/point-ledger.entity';
import { PointsService } from '../kudos/points.service';
import { RewardRedemptionStatus } from './constants/redemption.constants';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
import { RewardCatalogItem } from './entities/reward-catalog-item.entity';
import { RewardRedemption } from './entities/reward-redemption.entity';

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(RewardCatalogItem)
    private readonly catalog: Repository<RewardCatalogItem>,
    @InjectRepository(RewardRedemption)
    private readonly redemptions: Repository<RewardRedemption>,
    private readonly points: PointsService,
    private readonly dataSource: DataSource,
  ) {}

  listCatalog() {
    return this.catalog.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', title: 'ASC' },
      select: {
        id: true,
        title: true,
        description: true,
        pointsCost: true,
        imageUrl: true,
        stock: true,
        sortOrder: true,
      },
    });
  }

  async redeem(userId: string, dto: RedeemRewardDto) {
    const key =
      dto.idempotencyKey?.trim().slice(0, 64) ||
      randomUUID().replace(/-/g, '');
    const existing = await this.redemptions.findOne({
      where: { idempotencyKey: key },
      relations: { rewardItem: true },
    });
    if (existing) {
      return {
        id: existing.id,
        status: existing.status,
        pointsSpent: existing.pointsSpent,
        rewardItem: {
          id: existing.rewardItem.id,
          title: existing.rewardItem.title,
        },
        idempotent: true,
      };
    }
    const item = await this.catalog.findOne({
      where: { id: dto.rewardItemId, isActive: true },
    });
    if (!item) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Phần thưởng không tồn tại hoặc đã ngừng.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (item.stock !== null && item.stock < 1) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Hết hàng.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const summary = await this.points.getSummaryForUser(userId);
    if (summary.balance < item.pointsCost) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Số dư điểm không đủ để đổi.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.dataSource.transaction(async (manager) => {
      const dup = await manager.findOne(RewardRedemption, {
        where: { idempotencyKey: key },
        relations: { rewardItem: true },
      });
      if (dup) {
        return {
          id: dup.id,
          status: dup.status,
          pointsSpent: dup.pointsSpent,
          rewardItem: {
            id: dup.rewardItem.id,
            title: dup.rewardItem.title,
          },
          idempotent: true,
        };
      }
      const fresh = await manager.findOne(RewardCatalogItem, {
        where: { id: dto.rewardItemId, isActive: true },
      });
      if (!fresh) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Phần thưởng không tồn tại.',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (fresh.stock !== null && fresh.stock < 1) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Hết hàng.',
          HttpStatus.BAD_REQUEST,
        );
      }
      const bal = await this.points.getSummaryForUser(userId);
      if (bal.balance < fresh.pointsCost) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Số dư điểm không đủ để đổi.',
          HttpStatus.BAD_REQUEST,
        );
      }
      const red = manager.create(RewardRedemption, {
        userId,
        rewardItemId: fresh.id,
        pointsSpent: fresh.pointsCost,
        status: RewardRedemptionStatus.PENDING,
        idempotencyKey: key,
      });
      const saved = await manager.save(red);
      await manager.save(
        manager.create(PointLedger, {
          userId,
          amount: -fresh.pointsCost,
          entryType: PointLedgerEntryType.REWARD_REDEMPTION,
          redemptionId: saved.id,
          kudoId: null,
        }),
      );
      if (fresh.stock !== null) {
        const upd = await manager
          .createQueryBuilder()
          .update(RewardCatalogItem)
          .set({ stock: () => '"stock" - 1' })
          .where('id = :id AND stock IS NOT NULL AND stock >= 1', {
            id: fresh.id,
          })
          .execute();
        if (upd.affected !== 1) {
          throw new AppException(
            ErrorCode.BAD_REQUEST,
            'Hết hàng.',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      return {
        id: saved.id,
        status: saved.status,
        pointsSpent: saved.pointsSpent,
        rewardItem: { id: fresh.id, title: fresh.title },
        idempotent: false,
      };
    });
  }
}
