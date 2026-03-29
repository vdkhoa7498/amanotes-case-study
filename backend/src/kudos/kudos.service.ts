import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Buffer } from 'node:buffer';
import { Brackets, In, Repository } from 'typeorm';
import { AppException } from '../common/errors';
import { ErrorCode } from '../common/errors/error-codes';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import {
  KudoMediaProcessingStatus,
  KudoStatus,
  PointLedgerEntryType,
  totalPointsFromRecipientRows,
} from './constants/kudo.constants';
import { AddCommentDto } from './dto/add-comment.dto';
import { CreateKudoDto } from './dto/create-kudo.dto';
import { KudoFeedQueryDto } from './dto/feed-query.dto';
import { ReceivedShoutoutsQueryDto } from './dto/received-shoutouts-query.dto';
import { AttachedMedia } from './entities/attached-media.entity';
import { CoreValue } from './entities/core-value.entity';
import { KudoComment } from './entities/kudo-comment.entity';
import { KudoReaction } from './entities/kudo-reaction.entity';
import { KudoRecipient } from './entities/kudo-recipient.entity';
import { Kudo } from './entities/kudo.entity';
import { PointLedger } from './entities/point-ledger.entity';
import { MqttShoutoutBridgeService } from '../notifications/mqtt-shoutout-bridge.service';
import { MonthlyGivingBudgetService } from './services/monthly-giving-budget.service';
import { utcMonthKey, utcMonthRangeTimestamptz, utcStartOfMonth } from './utils/utc-month';

function publicUser(u: User) {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    avatar: u.avatar,
  };
}

function encodeShoutoutsCursor(createdAt: Date, id: string): string {
  return Buffer.from(
    JSON.stringify({ a: createdAt.toISOString(), i: id }),
    'utf8',
  ).toString('base64url');
}

function decodeShoutoutsCursor(cursor: string): { createdAt: Date; id: string } {
  const raw = Buffer.from(cursor, 'base64url').toString('utf8');
  const o = JSON.parse(raw) as { a?: string; i?: string };
  if (typeof o?.a !== 'string' || typeof o?.i !== 'string') {
    throw new Error('bad shape');
  }
  const createdAt = new Date(o.a);
  if (Number.isNaN(createdAt.getTime())) {
    throw new Error('bad date');
  }
  if (!/^[0-9a-f-]{36}$/i.test(o.i)) {
    throw new Error('bad id');
  }
  return { createdAt, id: o.i };
}

@Injectable()
export class KudosService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Kudo)
    private readonly kudos: Repository<Kudo>,
    @InjectRepository(KudoRecipient)
    private readonly kudoRecipients: Repository<KudoRecipient>,
    @InjectRepository(CoreValue)
    private readonly coreValues: Repository<CoreValue>,
    @InjectRepository(KudoComment)
    private readonly comments: Repository<KudoComment>,
    @InjectRepository(KudoReaction)
    private readonly reactions: Repository<KudoReaction>,
    private readonly users: UsersService,
    private readonly budget: MonthlyGivingBudgetService,
    private readonly shoutoutBridge: MqttShoutoutBridgeService,
  ) {}

  private mediaPublicUrl(storageKey: string): string {
    const base = this.config.get<string>('S3_PUBLIC_BASE_URL')?.replace(/\/$/, '') ?? '';
    const bucket = this.config.get<string>('S3_BUCKET') ?? 'avatars';
    return `${base}/${bucket}/${storageKey}`;
  }

  private assertValidCommentMediaKey(key: string): void {
    if (
      !/^comments\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|mp4|webm)$/i.test(
        key,
      )
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'mediaKeys không hợp lệ.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

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

    const created = await this.mapCreatedKudo(kudoId);
    const preview =
      created.description.length > 280
        ? `${created.description.slice(0, 280)}…`
        : created.description;
    for (const r of created.recipients) {
      this.shoutoutBridge.publishRecipientShoutout(r.userId, {
        type: 'kudo_received',
        kudoId: created.id,
        points: r.points,
        sender: created.sender,
        coreValue: created.coreValue,
        descriptionPreview: preview,
        createdAt: created.createdAt.toISOString(),
      });
    }
    return created;
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

  listReceivedShoutouts(viewerId: string, q: ReceivedShoutoutsQueryDto) {
    const limit = Math.min(Math.max(q.limit ?? 3, 1), 50);
    const qb = this.kudoRecipients
      .createQueryBuilder('kr')
      .innerJoinAndSelect('kr.kudo', 'kudo')
      .leftJoinAndSelect('kudo.sender', 'sender')
      .leftJoinAndSelect('kudo.coreValue', 'coreValue')
      .where('kr.userId = :uid', { uid: viewerId })
      .andWhere('kudo.status = :st', { st: KudoStatus.READY })
      .orderBy('kudo.createdAt', 'DESC')
      .addOrderBy('kudo.id', 'DESC')
      .take(limit + 1);

    const c = q.cursor?.trim();
    if (c) {
      let parsed: { createdAt: Date; id: string };
      try {
        parsed = decodeShoutoutsCursor(c);
      } catch {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'cursor không hợp lệ.',
          HttpStatus.BAD_REQUEST,
        );
      }
      qb.andWhere(
        '(kudo.createdAt < :cAt OR (kudo.createdAt = :cAt AND kudo.id < :cId))',
        { cAt: parsed.createdAt, cId: parsed.id },
      );
    }

    return qb.getMany().then((rows) => {
      const more = rows.length > limit;
      const slice = more ? rows.slice(0, limit) : rows;
      const lastKr = slice[slice.length - 1];
      const nextCursor =
        more && lastKr
          ? encodeShoutoutsCursor(lastKr.kudo.createdAt, lastKr.kudo.id)
          : null;
      return {
        items: slice.map((kr) => this.mapRecipientToShoutoutPayload(kr)),
        nextCursor,
      };
    });
  }

  private mapRecipientToShoutoutPayload(kr: KudoRecipient) {
    const k = kr.kudo;
    const desc = k.description;
    const preview = desc.length > 280 ? `${desc.slice(0, 280)}…` : desc;
    return {
      type: 'kudo_received' as const,
      kudoId: k.id,
      points: kr.points,
      sender: publicUser(k.sender),
      coreValue: {
        id: k.coreValue.id,
        slug: k.coreValue.slug,
        name: k.coreValue.name,
      },
      descriptionPreview: preview,
      createdAt: k.createdAt.toISOString(),
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
        url: this.mediaPublicUrl(m.storageKey),
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
          url: this.mediaPublicUrl(m.storageKey),
        })),
      })),
    };
  }

  /** Điểm nhận được từ kudos (ready) trong tháng UTC hiện tại, xếp hạng giảm dần. */
  async getMonthlyReceivedRanking() {
    const { startIso, endExclusiveIso } = utcMonthRangeTimestamptz();
    const rows = (await this.kudos.manager.query(
      `SELECT kr.user_id AS "userId", SUM(kr.points)::int AS points
       FROM kudo_recipients kr
       INNER JOIN kudos k ON k.id = kr.kudo_id
       WHERE k.status = $3
         AND k.created_at >= $1::timestamptz
         AND k.created_at < $2::timestamptz
       GROUP BY kr.user_id
       ORDER BY points DESC`,
      [startIso, endExclusiveIso, KudoStatus.READY],
    )) as unknown as Array<{ userId: string; points: string }>;
    const userIds = rows.map((r) => r.userId);
    const userList = await this.users.findByIds(userIds);
    const byId = new Map(userList.map((u) => [u.id, u]));
    const entries = rows
      .map((r, i) => {
        const u = byId.get(r.userId);
        if (!u) return null;
        return {
          rank: i + 1,
          points: Number(r.points),
          user: publicUser(u),
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
    return { monthKey: utcMonthKey(), entries };
  }

  async getKudoDetail(_viewerId: string, kudoId: string) {
    const kudo = await this.kudos.findOne({
      where: { id: kudoId, status: KudoStatus.READY },
      relations: {
        sender: true,
        coreValue: true,
        recipients: { recipient: true },
        attachedMedia: true,
        reactions: { user: true },
      },
    });
    if (!kudo) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Không tìm thấy kudo hoặc chưa hiển thị.',
        HttpStatus.NOT_FOUND,
      );
    }
    const allComments = await this.comments.find({
      where: { kudoId },
      relations: { author: true, attachedMedia: true },
      order: { createdAt: 'ASC' },
    });
    return this.mapFeedItem(kudo, allComments);
  }

  async removeReaction(viewer: User, kudoId: string) {
    const kudo = await this.kudos.findOne({
      where: { id: kudoId, status: KudoStatus.READY },
    });
    if (!kudo) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Kudo không tồn tại hoặc chưa hiển thị.',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.reactions.delete({ kudoId, userId: viewer.id });
    return { ok: true as const };
  }

  async setReaction(viewer: User, kudoId: string, emoji: string) {
    const kudo = await this.kudos.findOne({
      where: { id: kudoId, status: KudoStatus.READY },
    });
    if (!kudo) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Kudo không tồn tại hoặc chưa hiển thị.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const e = emoji.trim();
    let row = await this.reactions.findOne({
      where: { kudoId, userId: viewer.id },
    });
    if (row) {
      row.emoji = e;
      await this.reactions.save(row);
    } else {
      row = this.reactions.create({ kudoId, userId: viewer.id, emoji: e });
      await this.reactions.save(row);
    }
    const withUser = await this.reactions.findOneOrFail({
      where: { id: row.id },
      relations: { user: true },
    });
    return {
      id: withUser.id,
      emoji: withUser.emoji,
      createdAt: withUser.createdAt,
      user: publicUser(withUser.user),
    };
  }

  async addComment(viewer: User, kudoId: string, dto: AddCommentDto) {
    const kudo = await this.kudos.findOne({
      where: { id: kudoId, status: KudoStatus.READY },
    });
    if (!kudo) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Kudo không tồn tại hoặc chưa hiển thị.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const body = dto.body.trim();
    const savedId = await this.comments.manager.transaction(async (em) => {
      const commentRepo = em.getRepository(KudoComment);
      const mediaRepo = em.getRepository(AttachedMedia);
      const c = commentRepo.create({
        kudoId,
        authorId: viewer.id,
        body,
      });
      const saved = await commentRepo.save(c);
      if (dto.mediaKeys?.length) {
        let order = 0;
        for (const key of dto.mediaKeys) {
          this.assertValidCommentMediaKey(key);
          const mediaType = /\.(mp4|webm)$/i.test(key) ? 'video' : 'image';
          await mediaRepo.save(
            mediaRepo.create({
              commentId: saved.id,
              kudoId: null,
              mediaType,
              storageKey: key,
              processingStatus: KudoMediaProcessingStatus.READY,
              sortOrder: order,
            }),
          );
          order += 1;
        }
      }
      return saved.id;
    });
    const full = await this.comments.findOneOrFail({
      where: { id: savedId },
      relations: { author: true, attachedMedia: true },
    });
    return {
      id: full.id,
      body: full.body,
      createdAt: full.createdAt,
      updatedAt: full.updatedAt,
      author: publicUser(full.author),
      media: (full.attachedMedia ?? []).map((m: AttachedMedia) => ({
        id: m.id,
        mediaType: m.mediaType,
        processingStatus: m.processingStatus,
        durationSeconds: m.durationSeconds,
        url: this.mediaPublicUrl(m.storageKey),
      })),
    };
  }
}
