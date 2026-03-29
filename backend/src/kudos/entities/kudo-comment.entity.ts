import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AttachedMedia } from './attached-media.entity';
import { Kudo } from './kudo.entity';

@Entity('kudo_comments')
export class KudoComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'kudo_id', type: 'uuid' })
  kudoId: string;

  @ManyToOne(() => Kudo, (k) => k.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kudo_id' })
  kudo: Kudo;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'text' })
  body: string;

  @OneToMany(() => AttachedMedia, (m) => m.comment, { cascade: ['insert'] })
  attachedMedia: AttachedMedia[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
