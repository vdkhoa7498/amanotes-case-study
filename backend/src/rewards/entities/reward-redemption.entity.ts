import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RewardRedemptionStatus } from '../constants/redemption.constants';
import { RewardCatalogItem } from './reward-catalog-item.entity';

@Entity('reward_redemptions')
export class RewardRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'reward_item_id', type: 'uuid' })
  rewardItemId: string;

  @ManyToOne(() => RewardCatalogItem, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'reward_item_id' })
  rewardItem: RewardCatalogItem;

  @Column({ name: 'points_spent', type: 'int' })
  pointsSpent: number;

  @Column({
    type: 'varchar',
    length: 24,
    default: RewardRedemptionStatus.PENDING,
  })
  status: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 64, unique: true })
  idempotencyKey: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
