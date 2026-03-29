import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_monthly_giving_usage')
@Unique(['userId', 'yearMonth'])
export class UserMonthlyGivingUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** First day of calendar month (normalize in app layer). */
  @Column({ name: 'year_month', type: 'date' })
  yearMonth: Date;

  @Column({ name: 'points_spent', type: 'int', default: 0 })
  pointsSpent: number;

  @VersionColumn()
  version: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
