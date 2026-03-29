import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { KudosModule } from '../kudos/kudos.module';
import { PointLedger } from '../kudos/entities/point-ledger.entity';
import { RewardCatalogItem } from './entities/reward-catalog-item.entity';
import { RewardRedemption } from './entities/reward-redemption.entity';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';

@Module({
  imports: [
    AuthModule,
    KudosModule,
    TypeOrmModule.forFeature([RewardCatalogItem, RewardRedemption, PointLedger]),
  ],
  controllers: [RewardsController],
  providers: [RewardsService],
  exports: [TypeOrmModule, RewardsService],
})
export class RewardsModule {}
