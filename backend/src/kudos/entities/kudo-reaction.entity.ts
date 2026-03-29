import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Kudo } from './kudo.entity';

@Entity('kudo_reactions')
@Unique(['kudoId', 'userId'])
export class KudoReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'kudo_id', type: 'uuid' })
  kudoId: string;

  @ManyToOne(() => Kudo, (k) => k.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kudo_id' })
  kudo: Kudo;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 32 })
  emoji: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
