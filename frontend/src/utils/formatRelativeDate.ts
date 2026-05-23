import { calendarRelativeDay } from './formatDate'

export function formatRelativeDate(dateStr: string | null | undefined, showTime = false): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - targetDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const futureDays = Math.abs(diffDays)
    if (showTime) {
      const t = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      if (futureDays === 1) return `Tomorrow ${t}`
      if (futureDays <= 6) return `${date.toLocaleDateString('en-GB', { weekday: 'short' })} ${t}`
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    }
    if (futureDays === 1) return 'Tomorrow'
    if (futureDays <= 6) return `in ${futureDays}d`
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const base = calendarRelativeDay(dateStr)
  if (base === 'today') {
    if (showTime) {
      const t = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      return `Today ${t}`
    }
    return 'Today'
  }
  if (base === 'yesterday') return 'Yesterday'
  return base.charAt(0).toUpperCase() + base.slice(1)
}
