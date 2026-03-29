import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CoreValue } from '../kudos/entities/core-value.entity';
import { RewardCatalogItem } from '../rewards/entities/reward-catalog-item.entity';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([RewardCatalogItem, CoreValue]),
  ],
  controllers: [AdminController],
})
export class AdminModule {}
