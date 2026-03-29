import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  KudoStatus,
  MONTHLY_GIVING_BUDGET_POINTS,
  PointLedgerEntryType,
} from './constants/kudo.constants';
import { KudoRecipient } from './entities/kudo-recipient.entity';
import { PointLedger } from './entities/point-ledger.entity';
import { UserMonthlyGivingUsage } from './entities/user-monthly-giving-usage.entity';
import { utcMonthKey } from './utils/utc-month';

export type PointsSummaryDto = {
  balance: number;
  totalReceivedFromKudos: number;
  totalGivenViaKudos: number;
  monthlyGivingSpent: number;
  monthlyGivingRemaining: number;
  monthlyGivingCap: number;
  /** Số dòng nhận điểm từ kudo (≈ lượt được nhận). */
  kudosReceivedCount: number;
  /** Số lần đổi thưởng (distinct redemption). */
  rewardRedemptionsCount: number;
  /** Số người khác nhau đã gửi kudo tới bạn (kudo ready). */
  uniqueShoutoutSenderCount: number;
};

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PointLedger)
    private readonly ledger: Repository<PointLedger>,
    @InjectRepository(UserMonthlyGivingUsage)
    private readonly monthlyUsage: Repository<UserMonthlyGivingUsage>,
    @InjectRepository(KudoRecipient)
    private readonly kudoRecipients: Repository<KudoRecipient>,
  ) {}

  async getSummaryForUser(userId: string): Promise<PointsSummaryDto> {
    const raw = await this.ledger
      .createQueryBuilder('pl')
      .select(
        `COALESCE(SUM(CASE WHEN pl.entry_type <> :given THEN pl.amount ELSE 0 END), 0)`,
        'balance',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN pl.entry_type = :recv THEN pl.amount ELSE 0 END), 0)`,
        'totalReceived',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN pl.entry_type = :given THEN -pl.amount ELSE 0 END), 0)`,
        'totalGiven',
      )
      .where('pl.user_id = :userId', { userId })
      .setParameters({
        recv: PointLedgerEntryType.KUDO_RECEIVED,
        given: PointLedgerEntryType.KUDO_GIVEN,
      })
      .getRawOne<{
        balance: string;
        totalReceived: string;
        totalGiven: string;
      }>();

    const ymKey = utcMonthKey();
    const usage = await this.monthlyUsage
      .createQueryBuilder('u')
      .where('u.user_id = :userId', { userId })
      .andWhere('u.year_month = CAST(:ym AS date)', { ym: ymKey })
      .getOne();
    const monthlyGivingSpent = usage?.pointsSpent ?? 0;
    const monthlyGivingRemaining = Math.max(
      0,
      MONTHLY_GIVING_BUDGET_POINTS - monthlyGivingSpent,
    );

    const [kudosReceivedCount, redemptionRow, shoutoutRow] = await Promise.all([
      this.ledger.count({
        where: {
          userId,
          entryType: PointLedgerEntryType.KUDO_RECEIVED,
        },
      }),
      this.ledger
        .createQueryBuilder('pl')
        .select('COUNT(DISTINCT pl.redemption_id)', 'cnt')
        .where('pl.user_id = :userId', { userId })
        .andWhere('pl.entry_type = :rt', {
          rt: PointLedgerEntryType.REWARD_REDEMPTION,
        })
        .andWhere('pl.redemption_id IS NOT NULL')
        .getRawOne<{ cnt: string }>(),
      this.kudoRecipients
        .createQueryBuilder('kr')
        .innerJoin('kr.kudo', 'k')
        .select('COUNT(DISTINCT k.sender_id)', 'cnt')
        .where('kr.user_id = :userId', { userId })
        .andWhere('k.status = :st', { st: KudoStatus.READY })
        .getRawOne<{ cnt: string }>(),
    ]);

    return {
      balance: Number(raw?.balance ?? 0),
      totalReceivedFromKudos: Number(raw?.totalReceived ?? 0),
      totalGivenViaKudos: Number(raw?.totalGiven ?? 0),
      monthlyGivingSpent,
      monthlyGivingRemaining,
      monthlyGivingCap: MONTHLY_GIVING_BUDGET_POINTS,
      kudosReceivedCount,
      rewardRedemptionsCount: Number(redemptionRow?.cnt ?? 0),
      uniqueShoutoutSenderCount: Number(shoutoutRow?.cnt ?? 0),
    };
  }
}
