export type UrgencyStatus = 'overdue' | 'critical' | 'normal'

/**
 * Returns the urgency status for a short-term objective based on its target date.
 * - 'overdue': past due
 * - 'critical': due within 6 weeks (42 days)
 * - 'normal': more than 6 weeks away or no date
 */
export function getObjectiveUrgency(targetDate: string | null): UrgencyStatus {
  if (!targetDate) return 'normal'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(targetDate + 'T00:00:00')
  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 42) return 'critical'
  return 'normal'
}

/**
 * Returns days remaining until target date (negative if overdue).
 */
export function getDaysRemaining(targetDate: string | null): number | null {
  if (!targetDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(targetDate + 'T00:00:00')
  return Math.floor((due.getTime() - today.getTime()) / 86400000)
}

export function formatDaysRemaining(days: number): string {
  if (days < 0) return 'OVERDUE'
  if (days === 0) return 'Due today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}
