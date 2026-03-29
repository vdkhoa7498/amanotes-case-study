import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Kudo } from './kudo.entity';

@Entity('kudo_recipients')
export class KudoRecipient {
  @PrimaryColumn('uuid', { name: 'kudo_id' })
  kudoId: string;

  @PrimaryColumn('uuid', { name: 'user_id' })
  userId: string;

  @Column({ type: 'int' })
  points: number;

  @ManyToOne(() => Kudo, (k) => k.recipients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kudo_id' })
  kudo: Kudo;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  recipient: User;
}
