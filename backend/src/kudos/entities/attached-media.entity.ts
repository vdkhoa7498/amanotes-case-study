import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { KudoMediaProcessingStatus } from '../constants/kudo.constants';
import { KudoComment } from './kudo-comment.entity';
import { Kudo } from './kudo.entity';

/** Unified media row: either on a kudo or on a comment (exactly one parent). */
@Entity('attached_media')
export class AttachedMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'kudo_id', type: 'uuid', nullable: true })
  kudoId: string | null;

  @ManyToOne(() => Kudo, (k) => k.attachedMedia, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'kudo_id' })
  kudo: Kudo | null;

  @Column({ name: 'comment_id', type: 'uuid', nullable: true })
  commentId: string | null;

  @ManyToOne(() => KudoComment, (c) => c.attachedMedia, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'comment_id' })
  comment: KudoComment | null;

  @Column({ name: 'media_type', type: 'varchar', length: 16 })
  mediaType: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 2048 })
  storageKey: string;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds: number | null;

  @Column({
    name: 'processing_status',
    type: 'varchar',
    length: 24,
    default: KudoMediaProcessingStatus.PENDING,
  })
  processingStatus: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
