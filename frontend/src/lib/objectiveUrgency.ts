export type UrgencyStatus = 'overdue' | 'critical' | 'normal'

const MS_PER_DAY = 86_400_000

function calendarDaysRemaining(targetDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(targetDate)
  if (!match) return 0
  const today = new Date()
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const dueUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Math.floor((dueUtc - todayUtc) / MS_PER_DAY)
}

/**
 * Returns the urgency status for a short-term objective based on its target date.
 * - 'overdue': past due
 * - 'critical': due within 3 days (shows NEAR DATE badge)
 * - 'normal': more than 3 days away or no date
 */
export function getObjectiveUrgency(targetDate: string | null): UrgencyStatus {
  if (!targetDate) return 'normal'
  const diffDays = calendarDaysRemaining(targetDate)
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 3) return 'critical'
  return 'normal'
}

/**
 * Returns days remaining until target date (negative if overdue).
 */
export function getDaysRemaining(targetDate: string | null): number | null {
  if (!targetDate) return null
  return calendarDaysRemaining(targetDate)
}

export function formatDaysRemaining(days: number): string {
  if (days < 0) return 'OVERDUE'
  if (days === 0) return 'Due today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}
