import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { KudoStatus } from '../constants/kudo.constants';
import { AttachedMedia } from './attached-media.entity';
import { CoreValue } from './core-value.entity';
import { KudoComment } from './kudo-comment.entity';
import { KudoReaction } from './kudo-reaction.entity';
import { KudoRecipient } from './kudo-recipient.entity';

@Entity('kudos')
export class Kudo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ name: 'core_value_id', type: 'uuid' })
  coreValueId: string;

  @ManyToOne(() => CoreValue, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'core_value_id' })
  coreValue: CoreValue;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 24, default: KudoStatus.PROCESSING })
  status: string;

  @OneToMany(() => KudoRecipient, (r) => r.kudo, { cascade: ['insert'] })
  recipients: KudoRecipient[];

  @OneToMany(() => AttachedMedia, (m) => m.kudo, { cascade: ['insert'] })
  attachedMedia: AttachedMedia[];

  @OneToMany(() => KudoReaction, (r) => r.kudo)
  reactions: KudoReaction[];

  @OneToMany(() => KudoComment, (c) => c.kudo)
  comments: KudoComment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
