import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RewardRedemption } from '../../rewards/entities/reward-redemption.entity';
import { Kudo } from './kudo.entity';

/**
 * Double-entry for kudos (enforced at commit by DB trigger: SUM(amount)=0 per kudo_id):
 * - one `kudo_given` (sender, negative sum of all recipient allocations)
 * - one `kudo_received` per recipient row (positive)
 * Redemption: many rows per `redemption_id` allowed (debit, refund, adjustments).
 */
@Entity('point_ledger')
export class PointLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  amount: number;

  @Column({ name: 'entry_type', type: 'varchar', length: 32 })
  entryType: string;

  @Column({ name: 'kudo_id', type: 'uuid', nullable: true })
  kudoId: string | null;

  @ManyToOne(() => Kudo, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'kudo_id' })
  kudo: Kudo | null;

  @Column({ name: 'redemption_id', type: 'uuid', nullable: true })
  redemptionId: string | null;

  @ManyToOne(() => RewardRedemption, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'redemption_id' })
  redemption: RewardRedemption | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
