import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { AttachedMedia } from './entities/attached-media.entity';
import { CoreValue } from './entities/core-value.entity';
import { KudoComment } from './entities/kudo-comment.entity';
import { KudoReaction } from './entities/kudo-reaction.entity';
import { KudoRecipient } from './entities/kudo-recipient.entity';
import { Kudo } from './entities/kudo.entity';
import { Mention } from './entities/mention.entity';
import { Notification } from './entities/notification.entity';
import { PointLedger } from './entities/point-ledger.entity';
import { UserMonthlyGivingUsage } from './entities/user-monthly-giving-usage.entity';
import { KudosController } from './kudos.controller';
import { KudosService } from './kudos.service';
import { PointsController } from './points.controller';
import { PointsService } from './points.service';
import { MonthlyGivingBudgetService } from './services/monthly-giving-budget.service';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    UsersModule,
    TypeOrmModule.forFeature([
      CoreValue,
      Kudo,
      KudoRecipient,
      AttachedMedia,
      KudoReaction,
      KudoComment,
      Mention,
      Notification,
      PointLedger,
      UserMonthlyGivingUsage,
    ]),
  ],
  controllers: [KudosController, PointsController],
  providers: [
    MonthlyGivingBudgetService,
    PointsService,
    KudosService,
  ],
  exports: [TypeOrmModule, MonthlyGivingBudgetService, PointsService],
})
export class KudosModule {}
