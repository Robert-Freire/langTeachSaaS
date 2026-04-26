import { type SessionLog, parseTopicTags } from '../api/sessionLogs'
import { formatMonthDay } from '../utils/formatDate'

/**
 * Display title for a session in list/history views.
 * Returns the explicit title if set, falls back to the first topic tag,
 * then "Session, Apr 5", or "Session" if no date is available.
 */
export function getSessionTitle(session: SessionLog): string {
  if (session.title) return session.title
  const tags = parseTopicTags(session.topicTags)
  if (tags.length > 0) return tags[0].tag
  if (session.sessionDate) return `Session, ${formatMonthDay(session.sessionDate)}`
  return 'Session'
}

/**
 * Compact display title for a session in overview/card views.
 * Returns the explicit title (unless it is the generic "Session"),
 * falls back to actualContent / generalNotes / plannedContent, or "Session".
 * Callers are responsible for visual overflow (CSS line-clamp), per design system §7.
 */
export function getDisplayTitle(session: SessionLog): string {
  if (session.title && session.title !== 'Session') return session.title
  return session.actualContent || session.generalNotes || session.plannedContent || 'Session'
}

/**
 * Most recent non-cancelled session with a date, or null.
 * Same filter as the compact RecentSessions strip so the two pickers stay in lock-step.
 */
export function pickLastSession(sessions: SessionLog[]): SessionLog | null {
  const candidates = sessions
    .filter(s => s.sessionDate && !s.isCancelled)
    .sort((a, b) => new Date(b.sessionDate!).getTime() - new Date(a.sessionDate!).getTime())
  return candidates[0] ?? null
}
