/**
 * Get Monday-based week boundaries for the given offset from the current week.
 * offset=0 is the current week, offset=1 is next week, offset=-1 is last week.
 */
export function getWeekBounds(offset: number): { start: Date; end: Date } {
  const now = new Date()
  const day = now.getDay()
  // JS getDay(): 0=Sun, 1=Mon ... 6=Sat
  // Convert to Monday-based: Mon=0, Tue=1, ..., Sun=6
  const mondayOffset = (day + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - mondayOffset + offset * 7)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return { start: monday, end: sunday }
}

/** Get all 7 dates (Mon-Sun) for the week at the given offset */
export function getWeekDays(offset: number): Date[] {
  const { start } = getWeekBounds(offset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

/** Format a date as "Mon 17" */
export function formatWeekDay(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${days[date.getDay()]} ${date.getDate()}`
}

/** Check if a date is today */
export function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

/** Get Monday-based day index: 0=Mon, 6=Sun */
export function getDayOfWeek(date: Date): number {
  return (date.getDay() + 6) % 7
}

/** Format date as ISO string for API query params (YYYY-MM-DDTHH:mm:ss) */
export function toISODateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}:${s}`
}

/** Format week range label like "Mar 10 - Mar 16, 2026" */
export function formatWeekRange(offset: number): string {
  const { start, end } = getWeekBounds(offset)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const startStr = start.toLocaleDateString(undefined, opts)
  const endStr = end.toLocaleDateString(undefined, { ...opts, year: 'numeric' })
  return `${startStr} - ${endStr}`
}
