import { type SessionLog } from '../api/sessionLogs'
import { formatMonthDay } from '../utils/formatDate'

/**
 * Display title for a session in list/history views.
 * Returns the explicit title if set, falls back to "Session, Apr 5",
 * or "Session" if no date is available.
 */
export function getSessionTitle(session: SessionLog): string {
  if (session.title) return session.title
  if (session.sessionDate) return `Session, ${formatMonthDay(session.sessionDate)}`
  return 'Session'
}

/**
 * Compact display title for a session in overview/card views.
 * Returns the explicit title (unless it is the generic "Session"),
 * falls back to truncated content, or "Session" as last resort.
 */
export function getDisplayTitle(session: SessionLog): string {
  if (session.title && session.title !== 'Session') return session.title
  const fallback = session.actualContent || session.generalNotes || session.plannedContent
  if (fallback) return fallback.slice(0, 55) + (fallback.length > 55 ? '...' : '')
  return 'Session'
}
