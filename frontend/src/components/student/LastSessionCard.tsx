import { Link } from 'react-router-dom'
import { BookOpen, ExternalLink, NotebookPen } from 'lucide-react'
import type { SessionLog } from '@/api/sessionLogs'
import { parseTopicTags } from '@/api/sessionLogs'
import { getDisplayTitle } from '@/lib/sessionUtils'
import { SectionHeader } from './SectionHeader'

interface Props {
  session: SessionLog | null
  studentId: string
}

function DateBadge({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const year = d.getFullYear()
  return (
    <div
      className="shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center bg-indigo-100"
      aria-label={dateStr}
      data-testid="last-session-date"
    >
      <span className="text-lg font-bold leading-none text-indigo-700">{day}</span>
      <span className="text-[9px] font-bold tracking-wide leading-none mt-0.5 text-indigo-500">
        {month} {year}
      </span>
    </div>
  )
}

export function LastSessionCard({ session, studentId }: Props) {
  if (!session) {
    return (
      <section
        className="bg-white rounded-2xl p-6"
        style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
        data-testid="last-session-card"
      >
        <SectionHeader>Last Session</SectionHeader>
        <p className="text-sm text-zinc-400 italic mb-3" data-testid="last-session-empty">
          No sessions logged yet.
        </p>
        <Link
          to={`/students/${studentId}/log-session`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          data-testid="last-session-log-link"
        >
          <NotebookPen className="h-3.5 w-3.5" />
          Log session
        </Link>
      </section>
    )
  }

  const title = getDisplayTitle(session)
  const tags = parseTopicTags(session.topicTags)
  const notes = session.generalNotes?.trim() || null
  const actual = session.actualContent?.trim() || null

  return (
    <section
      className="bg-white rounded-2xl p-6"
      style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
      data-testid="last-session-card"
    >
      <div className="flex items-center justify-between mb-3">
        <SectionHeader>Last Session</SectionHeader>
      </div>

      <div className="flex items-start gap-4">
        {session.sessionDate && <DateBadge dateStr={session.sessionDate} />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/students/${studentId}/sessions/${session.id}/edit`}
              className="text-[#1A1B22] hover:text-indigo-700 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              data-testid="last-session-title-link"
            >
              <h4
                className="font-manrope text-base font-bold leading-snug"
                data-testid="last-session-title"
              >
                {title}
              </h4>
            </Link>
            {session.duration && (
              <span
                className="text-xs text-zinc-500 bg-[#F4F2FD] rounded px-2 py-0.5"
                data-testid="last-session-duration"
              >
                {session.duration}min
              </span>
            )}
          </div>

          {actual && (
            <p
              className="text-sm text-zinc-700 mt-2 whitespace-pre-wrap"
              data-testid="last-session-content"
            >
              {actual}
            </p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3" data-testid="last-session-tags">
              {tags.map(t => (
                <span
                  key={t.tag}
                  className="bg-[#E2DFFF] text-[#3323CC] rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  data-testid="last-session-tag"
                >
                  {t.tag}
                </span>
              ))}
            </div>
          )}

          {notes && (
            <div className="mt-3 flex items-start gap-2 bg-[#FFF9F2] rounded-lg p-3">
              <BookOpen className="h-3.5 w-3.5 text-[#7E3000] mt-0.5 shrink-0" />
              <p
                className="text-xs text-[#1A1B22] whitespace-pre-wrap"
                data-testid="last-session-notes"
              >
                {notes}
              </p>
            </div>
          )}
          <div className="mt-4">
            <Link
              to={`/students/${studentId}/sessions/${session.id}/edit`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
              data-testid="last-session-view-link"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View session
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
