import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { AppException } from '../common/errors';
import { ErrorCode } from '../common/errors/error-codes';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import {
  KudoStatus,
  PointLedgerEntryType,
  totalPointsFromRecipientRows,
} from './constants/kudo.constants';
import { CreateKudoDto } from './dto/create-kudo.dto';
import { KudoFeedQueryDto } from './dto/feed-query.dto';
import { AttachedMedia } from './entities/attached-media.entity';
import { CoreValue } from './entities/core-value.entity';
import { KudoComment } from './entities/kudo-comment.entity';
import { KudoReaction } from './entities/kudo-reaction.entity';
import { KudoRecipient } from './entities/kudo-recipient.entity';
import { Kudo } from './entities/kudo.entity';
import { PointLedger } from './entities/point-ledger.entity';
import { MonthlyGivingBudgetService } from './services/monthly-giving-budget.service';
import { utcStartOfMonth } from './utils/utc-month';

function publicUser(u: User) {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    avatar: u.avatar,
  };
}

@Injectable()
export class KudosService {
  constructor(
    @InjectRepository(Kudo)
    private readonly kudos: Repository<Kudo>,
    @InjectRepository(CoreValue)
    private readonly coreValues: Repository<CoreValue>,
    @InjectRepository(KudoComment)
    private readonly comments: Repository<KudoComment>,
    private readonly users: UsersService,
    private readonly budget: MonthlyGivingBudgetService,
  ) {}

  listCoreValues() {
    return this.coreValues.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
      select: { id: true, slug: true, name: true, sortOrder: true },
    });
  }

  async createKudo(sender: User, dto: CreateKudoDto) {
    const recipientIds = dto.recipients.map((r) => r.userId);
    if (new Set(recipientIds).size !== recipientIds.length) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Không được trùng người nhận trong cùng một kudo.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (recipientIds.includes(sender.id)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Bạn không thể gửi kudo cho chính mình.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const cv = await this.coreValues.findOne({
      where: { id: dto.coreValueId, isActive: true },
    });
    if (!cv) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Core value không tồn tại hoặc đã tắt.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const recipientsUsers = await this.users.findByIds(recipientIds);
    if (recipientsUsers.length !== recipientIds.length) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Một hoặc nhiều người nhận không tồn tại.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const totalDelta = totalPointsFromRecipientRows(dto.recipients);
    const ym = utcStartOfMonth();

    const kudoId = await this.budget.withBudgetLock(sender.id, ym, async (manager) => {
      const consumed = await this.budget.tryConsumeBudget(
        manager,
        sender.id,
        ym,
        totalDelta,
      );
      if (!consumed) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Ngân sách cho điểm tháng này không đủ.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const kudo = manager.create(Kudo, {
        senderId: sender.id,
        coreValueId: dto.coreValueId,
        description: dto.description.trim(),
        status: KudoStatus.READY,
      });
      const saved = await manager.save(kudo);

      for (const r of dto.recipients) {
        await manager.save(
          manager.create(KudoRecipient, {
            kudoId: saved.id,
            userId: r.userId,
            points: r.points,
          }),
        );
      }

      await manager.save(
        manager.create(PointLedger, {
          userId: sender.id,
          amount: -totalDelta,
          entryType: PointLedgerEntryType.KUDO_GIVEN,
          kudoId: saved.id,
        }),
      );

      for (const r of dto.recipients) {
        await manager.save(
          manager.create(PointLedger, {
            userId: r.userId,
            amount: r.points,
            entryType: PointLedgerEntryType.KUDO_RECEIVED,
            kudoId: saved.id,
          }),
        );
      }

      return saved.id;
    });

    return this.mapCreatedKudo(kudoId);
  }

  private async mapCreatedKudo(id: string) {
    const kudo = await this.kudos.findOneOrFail({
      where: { id },
      relations: {
        sender: true,
        coreValue: true,
        recipients: { recipient: true },
      },
    });
    return {
      id: kudo.id,
      status: kudo.status,
      description: kudo.description,
      createdAt: kudo.createdAt,
      coreValue: {
        id: kudo.coreValue.id,
        slug: kudo.coreValue.slug,
        name: kudo.coreValue.name,
      },
      sender: publicUser(kudo.sender),
      recipients: kudo.recipients.map((r) => ({
        userId: r.userId,
        points: r.points,
        user: publicUser(r.recipient),
      })),
    };
  }

  async getFeed(viewerId: string, q: KudoFeedQueryDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const scope = q.scope ?? 'me';

    const filterQb = this.kudos
      .createQueryBuilder('kudo')
      .where('kudo.status = :st', { st: KudoStatus.READY });

    if (scope === 'me') {
      filterQb.andWhere(
        new Brackets((w) => {
          w.where('kudo.sender_id = :uid', { uid: viewerId }).orWhere(
            `EXISTS (SELECT 1 FROM kudo_recipients kr WHERE kr.kudo_id = kudo.id AND kr.user_id = :uid)`,
            { uid: viewerId },
          );
        }),
      );
    }

    const total = await filterQb.clone().getCount();
    const slice = await filterQb
      .clone()
      .orderBy('kudo.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const ids = slice.map((k) => k.id);
    if (ids.length === 0) {
      return {
        data: [],
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      };
    }

    const full = await this.kudos.find({
      where: { id: In(ids) },
      relations: {
        sender: true,
        coreValue: true,
        recipients: { recipient: true },
        attachedMedia: true,
        reactions: { user: true },
      },
      order: { createdAt: 'DESC' },
    });

    const order = new Map(ids.map((id, i) => [id, i]));
    full.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    const allComments = await this.comments.find({
      where: { kudoId: In(ids) },
      relations: { author: true, attachedMedia: true },
      order: { createdAt: 'ASC' },
    });

    const commentsByKudo = new Map<string, KudoComment[]>();
    for (const c of allComments) {
      const list = commentsByKudo.get(c.kudoId) ?? [];
      list.push(c);
      commentsByKudo.set(c.kudoId, list);
    }
    for (const [, list] of commentsByKudo) {
      if (list.length > 50) {
        list.splice(0, list.length - 50);
      }
    }

    const data = full.map((k) =>
      this.mapFeedItem(k, commentsByKudo.get(k.id) ?? []),
    );

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  private mapFeedItem(kudo: Kudo, kudoComments: KudoComment[]) {
    return {
      id: kudo.id,
      status: kudo.status,
      description: kudo.description,
      createdAt: kudo.createdAt,
      coreValue: {
        id: kudo.coreValue.id,
        slug: kudo.coreValue.slug,
        name: kudo.coreValue.name,
      },
      sender: publicUser(kudo.sender),
      recipients: kudo.recipients.map((r) => ({
        userId: r.userId,
        points: r.points,
        user: publicUser(r.recipient),
      })),
      media: (kudo.attachedMedia ?? []).map((m: AttachedMedia) => ({
        id: m.id,
        mediaType: m.mediaType,
        processingStatus: m.processingStatus,
        durationSeconds: m.durationSeconds,
        sortOrder: m.sortOrder,
      })),
      reactions: (kudo.reactions ?? []).map((r: KudoReaction) => ({
        id: r.id,
        emoji: r.emoji,
        createdAt: r.createdAt,
        user: publicUser(r.user),
      })),
      comments: kudoComments.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        author: publicUser(c.author),
        media: (c.attachedMedia ?? []).map((m: AttachedMedia) => ({
          id: m.id,
          mediaType: m.mediaType,
          processingStatus: m.processingStatus,
          durationSeconds: m.durationSeconds,
        })),
      })),
    };
  }
}
