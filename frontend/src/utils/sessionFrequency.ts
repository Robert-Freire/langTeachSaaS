interface SessionLike {
  isCancelled: boolean
  sessionDate: string | null
  statusName: string
}

export function calcSessionFrequency(sessions: SessionLike[]): string | null {
  const past = sessions
    .filter(s => !s.isCancelled && s.sessionDate && s.statusName === 'Confirmed' && new Date(s.sessionDate) <= new Date())
    .sort((a, b) => new Date(a.sessionDate!).getTime() - new Date(b.sessionDate!).getTime())
  if (past.length === 0) return null
  if (past.length === 1) return '1 session'
  const first = new Date(past[0].sessionDate!)
  const last = new Date(past[past.length - 1].sessionDate!)
  const spanDays = Math.round((last.getTime() - first.getTime()) / 86400000)
  if (spanDays < 14) return `${past.length} sessions`
  const weeks = Math.max(1, Math.round(spanDays / 7))
  const avgDays = Math.round(spanDays / (past.length - 1))
  const weekLabel = weeks === 1 ? '1 week' : `${weeks} weeks`
  return `${past.length} sessions in ${weekLabel} · avg. every ${avgDays} days`
}
