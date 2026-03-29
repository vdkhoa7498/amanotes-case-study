/** Calendar month start in UTC (matches `user_monthly_giving_usage.year_month` date storage). */
export function utcStartOfMonth(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** `YYYY-MM-DD` for Postgres `date` and raw SQL (always UTC month boundary). */
export function utcMonthKey(d: Date = new Date()): string {
  return utcStartOfMonth(d).toISOString().slice(0, 10);
}

/** `[start, end)` as ISO timestamps for filtering `timestamptz` within that UTC month. */
export function utcMonthRangeTimestamptz(d: Date = new Date()): {
  startIso: string;
  endExclusiveIso: string;
} {
  const start = utcStartOfMonth(d);
  const endExclusive = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
  );
  return {
    startIso: start.toISOString(),
    endExclusiveIso: endExclusive.toISOString(),
  };
}
