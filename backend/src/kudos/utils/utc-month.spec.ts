import {
  utcMonthKey,
  utcMonthRangeTimestamptz,
  utcStartOfMonth,
} from './utc-month';

describe('utcStartOfMonth', () => {
  it('returns the 1st day of the given month at UTC midnight', () => {
    const d = new Date('2024-06-15T12:30:00Z');
    expect(utcStartOfMonth(d).toISOString()).toBe('2024-06-01T00:00:00.000Z');
  });

  it('handles the last day of a month', () => {
    const d = new Date('2024-01-31T23:59:59Z');
    expect(utcStartOfMonth(d).toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('is idempotent when given the 1st of a month', () => {
    const d = new Date('2024-03-01T00:00:00Z');
    expect(utcStartOfMonth(d).toISOString()).toBe('2024-03-01T00:00:00.000Z');
  });

  it('defaults to the current month when no argument is given', () => {
    const now = new Date();
    const expected = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString();
    expect(utcStartOfMonth().toISOString()).toBe(expected);
  });
});

describe('utcMonthKey', () => {
  it('returns YYYY-MM-DD for the first of the UTC month', () => {
    expect(utcMonthKey(new Date('2024-06-15T12:30:00Z'))).toBe('2024-06-01');
  });

  it('handles December without rolling over the year', () => {
    expect(utcMonthKey(new Date('2024-12-31T23:59:59Z'))).toBe('2024-12-01');
  });

  it('handles January', () => {
    expect(utcMonthKey(new Date('2025-01-01T00:00:00Z'))).toBe('2025-01-01');
  });

  it('produces a valid date string parseable by Date', () => {
    const key = utcMonthKey(new Date('2024-08-20T10:00:00Z'));
    expect(isNaN(Date.parse(key))).toBe(false);
  });
});

describe('utcMonthRangeTimestamptz', () => {
  it('start is the 1st of the UTC month at midnight', () => {
    const { startIso } = utcMonthRangeTimestamptz(new Date('2024-06-15T12:30:00Z'));
    expect(startIso).toBe('2024-06-01T00:00:00.000Z');
  });

  it('endExclusive is the 1st of the following month', () => {
    const { endExclusiveIso } = utcMonthRangeTimestamptz(
      new Date('2024-06-15T12:30:00Z'),
    );
    expect(endExclusiveIso).toBe('2024-07-01T00:00:00.000Z');
  });

  it('rolls over from December to January of the next year', () => {
    const { startIso, endExclusiveIso } = utcMonthRangeTimestamptz(
      new Date('2024-12-15T00:00:00Z'),
    );
    expect(startIso).toBe('2024-12-01T00:00:00.000Z');
    expect(endExclusiveIso).toBe('2025-01-01T00:00:00.000Z');
  });

  it('start is strictly before endExclusive', () => {
    const { startIso, endExclusiveIso } = utcMonthRangeTimestamptz();
    expect(new Date(startIso) < new Date(endExclusiveIso)).toBe(true);
  });

  it('the range spans exactly one month (non-leap)', () => {
    const { startIso, endExclusiveIso } = utcMonthRangeTimestamptz(
      new Date('2023-02-10T00:00:00Z'),
    );
    const ms = new Date(endExclusiveIso).getTime() - new Date(startIso).getTime();
    const days = ms / (1000 * 60 * 60 * 24);
    expect(days).toBe(28); // February 2023
  });
});
