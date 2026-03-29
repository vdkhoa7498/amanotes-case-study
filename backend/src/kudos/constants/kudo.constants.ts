/** Kudo visible in feed after media pipeline finishes (if any). */
export const KudoStatus = {
  PROCESSING: 'processing',
  READY: 'ready',
} as const;

export type KudoStatusValue = (typeof KudoStatus)[keyof typeof KudoStatus];

export const KudoMediaProcessingStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const;

export type KudoMediaProcessingStatusValue =
  (typeof KudoMediaProcessingStatus)[keyof typeof KudoMediaProcessingStatus];

export const PointLedgerEntryType = {
  KUDO_GIVEN: 'kudo_given',
  KUDO_RECEIVED: 'kudo_received',
  REWARD_REDEMPTION: 'reward_redemption',
} as const;

export const MONTHLY_GIVING_BUDGET_POINTS = 200;

export const KUDO_POINTS_PER_RECIPIENT_MIN = 10;
export const KUDO_POINTS_PER_RECIPIENT_MAX = 50;

export function totalPointsFromRecipientRows(
  rows: ReadonlyArray<{ points: number }>,
): number {
  return rows.reduce((s, r) => s + r.points, 0);
}
