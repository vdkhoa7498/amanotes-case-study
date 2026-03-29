/**
 * `monthKey` từ API: ngày đầu tháng dạng `YYYY-MM-DD` (theo lịch tháng dùng cho xếp hạng / ngân sách).
 */
export function vietnameseMonthFromMonthKey(monthKey: string | undefined): string {
  if (!monthKey) return 'tháng này'
  const parts = monthKey.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  if (!y || !m || m < 1 || m > 12) return 'tháng này'
  const nowY = new Date().getFullYear()
  if (y === nowY) return `tháng ${m}`
  return `tháng ${m} năm ${y}`
}

/** Cùng quy ước tháng với backend (`utcMonthKey`). */
export function currentUtcMonthKey(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10)
}

export function currentBudgetMonthLabelVi(): string {
  return vietnameseMonthFromMonthKey(currentUtcMonthKey())
}
