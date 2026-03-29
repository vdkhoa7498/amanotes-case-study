import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Kudo } from './kudo.entity';
import { KudoComment } from './kudo-comment.entity';

@Entity('mentions')
export class Mention {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mentioned_user_id', type: 'uuid' })
  mentionedUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentioned_user_id' })
  mentionedUser: User;

  @Column({ name: 'kudo_id', type: 'uuid', nullable: true })
  kudoId: string | null;

  @ManyToOne(() => Kudo, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'kudo_id' })
  kudo: Kudo | null;

  @Column({ name: 'comment_id', type: 'uuid', nullable: true })
  commentId: string | null;

  @ManyToOne(() => KudoComment, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'comment_id' })
  comment: KudoComment | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
