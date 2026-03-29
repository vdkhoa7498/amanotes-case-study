import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  MONTHLY_GIVING_BUDGET_POINTS,
  PointLedgerEntryType,
} from '../constants/kudo.constants';
import { utcMonthKey, utcMonthRangeTimestamptz } from '../utils/utc-month';

function pgUpdateReturningRows<T extends Record<string, unknown>>(
  result: unknown,
): T[] {
  if (!Array.isArray(result) || result.length === 0) {
    return [];
  }
  const head = result[0];
  if (Array.isArray(head)) {
    return head as T[];
  }
  return result as T[];
}

/**
 * Monthly 200-point giving budget (sender). Uses:
 * - `pg_advisory_xact_lock` per (userId, calendar month) so concurrent kudos serialize.
 * - Single `UPDATE ... RETURNING` with cap check + `version` bump for optimistic safety outside this path.
 *
 * Call from inside {@link withBudgetLock} (or your own transaction that acquired the same lock).
 */
@Injectable()
export class MonthlyGivingBudgetService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Runs `work` in a transaction after taking a transaction-scoped advisory lock on (userId, yearMonth).
   */
  withBudgetLock<T>(
    userId: string,
    yearMonth: Date,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const ym = utcMonthKey(yearMonth);
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtext($1::text), hashtext($2::text))`,
        [userId, ym],
      );
      return work(manager);
    });
  }

  /**
   * Increments `points_spent` for the sender’s calendar month if `points_spent + delta <=` budget.
   * `deltaPoints` = total points for this operation (e.g. sum of all recipients on one kudo; sender may
   * split points across many people in one send as long as the monthly total stays within cap).
   * Ensures a usage row exists. Returns new totals or `null` if over cap (or row missing after race).
   */
  async tryConsumeBudget(
    manager: EntityManager,
    userId: string,
    yearMonth: Date,
    deltaPoints: number,
  ): Promise<{ id: string; pointsSpent: number; version: number } | null> {
    if (!Number.isInteger(deltaPoints) || deltaPoints < 1) {
      throw new Error('deltaPoints must be a positive integer');
    }
    const ym = utcMonthKey(yearMonth);
    const { startIso, endExclusiveIso } = utcMonthRangeTimestamptz(yearMonth);
    await manager.query(
      `INSERT INTO user_monthly_giving_usage (user_id, year_month, points_spent, version)
       VALUES ($1, $2::date, 0, 0)
       ON CONFLICT (user_id, year_month) DO NOTHING`,
      [userId, ym],
    );

    const updateResult = await manager.query(
      `UPDATE user_monthly_giving_usage AS u
       SET points_spent = u.points_spent + $1,
           version = u.version + 1,
           updated_at = now()
       WHERE u.user_id = $2 AND u.year_month = $3::date
         AND (
           GREATEST(
             COALESCE(
               (
                 SELECT SUM((-pl.amount)::bigint)
                 FROM point_ledger pl
                 INNER JOIN kudos k ON k.id = pl.kudo_id AND k.sender_id = pl.user_id
                 WHERE pl.user_id = $2
                   AND pl.entry_type = $6
                   AND pl.kudo_id IS NOT NULL
                   AND k.created_at >= $4::timestamptz
                   AND k.created_at < $5::timestamptz
               ),
               0
             ),
             u.points_spent::bigint
           ) + ($1::bigint)
         ) <= ($7::bigint)
       RETURNING u.id, u.points_spent, u.version`,
      [
        deltaPoints,
        userId,
        ym,
        startIso,
        endExclusiveIso,
        PointLedgerEntryType.KUDO_GIVEN,
        MONTHLY_GIVING_BUDGET_POINTS,
      ],
    );
    const updatedRows = pgUpdateReturningRows<{
      id: string;
      points_spent: string;
      version: string;
    }>(updateResult);
    const r = updatedRows[0];
    if (!r) return null;
    return {
      id: r.id,
      pointsSpent: Number(r.points_spent),
      version: Number(r.version),
    };
  }

  /** Budget cap (same value as product rule; keep in sync with {@link MONTHLY_GIVING_BUDGET_POINTS}). */
  monthlyCap(): number {
    return MONTHLY_GIVING_BUDGET_POINTS;
  }
}
