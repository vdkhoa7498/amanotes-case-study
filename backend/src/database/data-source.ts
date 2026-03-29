import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { AttachedMedia } from '../kudos/entities/attached-media.entity';
import { CoreValue } from '../kudos/entities/core-value.entity';
import { KudoComment } from '../kudos/entities/kudo-comment.entity';
import { KudoReaction } from '../kudos/entities/kudo-reaction.entity';
import { KudoRecipient } from '../kudos/entities/kudo-recipient.entity';
import { Kudo } from '../kudos/entities/kudo.entity';
import { Mention } from '../kudos/entities/mention.entity';
import { Notification } from '../kudos/entities/notification.entity';
import { PointLedger } from '../kudos/entities/point-ledger.entity';
import { UserMonthlyGivingUsage } from '../kudos/entities/user-monthly-giving-usage.entity';
import { RewardCatalogItem } from '../rewards/entities/reward-catalog-item.entity';
import { RewardRedemption } from '../rewards/entities/reward-redemption.entity';
import { User } from '../users/entities/user.entity';

config({
  path: join(__dirname, '../../.env'),
});

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    User,
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
    RewardCatalogItem,
    RewardRedemption,
  ],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});
