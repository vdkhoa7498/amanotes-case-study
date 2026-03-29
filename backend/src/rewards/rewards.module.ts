import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardCatalogItem } from './entities/reward-catalog-item.entity';
import { RewardRedemption } from './entities/reward-redemption.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RewardCatalogItem, RewardRedemption])],
  exports: [TypeOrmModule],
})
export class RewardsModule {}
