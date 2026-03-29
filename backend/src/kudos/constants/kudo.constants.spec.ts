import {
  KUDO_POINTS_PER_RECIPIENT_MAX,
  KUDO_POINTS_PER_RECIPIENT_MIN,
  MONTHLY_GIVING_BUDGET_POINTS,
  totalPointsFromRecipientRows,
} from './kudo.constants';

describe('totalPointsFromRecipientRows', () => {
  it('sums points across multiple recipients', () => {
    expect(
      totalPointsFromRecipientRows([
        { points: 10 },
        { points: 20 },
        { points: 30 },
      ]),
    ).toBe(60);
  });

  it('returns 0 for an empty array', () => {
    expect(totalPointsFromRecipientRows([])).toBe(0);
  });

  it('returns the single value when there is one recipient', () => {
    expect(totalPointsFromRecipientRows([{ points: 50 }])).toBe(50);
  });

  it('handles the maximum allowed points per recipient', () => {
    const rows = [
      { points: KUDO_POINTS_PER_RECIPIENT_MAX },
      { points: KUDO_POINTS_PER_RECIPIENT_MAX },
    ];
    expect(totalPointsFromRecipientRows(rows)).toBe(100);
  });

  it('handles the minimum allowed points per recipient', () => {
    expect(
      totalPointsFromRecipientRows([{ points: KUDO_POINTS_PER_RECIPIENT_MIN }]),
    ).toBe(10);
  });

  it('correctly sums when total equals the monthly budget cap', () => {
    // 4 recipients × 50 pts = 200, exactly at the cap
    const rows = Array.from({ length: 4 }, () => ({
      points: KUDO_POINTS_PER_RECIPIENT_MAX,
    }));
    expect(totalPointsFromRecipientRows(rows)).toBe(MONTHLY_GIVING_BUDGET_POINTS);
  });

  it('correctly sums when total exceeds the monthly budget cap', () => {
    // 5 recipients × 50 pts = 250, above the cap
    const rows = Array.from({ length: 5 }, () => ({
      points: KUDO_POINTS_PER_RECIPIENT_MAX,
    }));
    expect(totalPointsFromRecipientRows(rows)).toBeGreaterThan(
      MONTHLY_GIVING_BUDGET_POINTS,
    );
  });
});

describe('point rule constants', () => {
  it('monthly budget is 200 points', () => {
    expect(MONTHLY_GIVING_BUDGET_POINTS).toBe(200);
  });

  it('minimum points per recipient is 10', () => {
    expect(KUDO_POINTS_PER_RECIPIENT_MIN).toBe(10);
  });

  it('maximum points per recipient is 50', () => {
    expect(KUDO_POINTS_PER_RECIPIENT_MAX).toBe(50);
  });

  it('min is less than max', () => {
    expect(KUDO_POINTS_PER_RECIPIENT_MIN).toBeLessThan(
      KUDO_POINTS_PER_RECIPIENT_MAX,
    );
  });
});
