import { Link } from 'react-router-dom'
import type { GroupSession } from '@/api/groups'

interface Props {
  groupId: string
  sessions: GroupSession[]
}

function DateBlock({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const year = d.getFullYear()
  return (
    <div className="shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center bg-indigo-100">
      <span className="text-base font-bold leading-none text-indigo-700">{day}</span>
      <span className="text-[9px] font-bold tracking-wide leading-none mt-0.5 text-indigo-500">
        {month} {year}
      </span>
    </div>
  )
}

export function GroupSessionsTab({ groupId, sessions }: Props) {
  const sorted = [...sessions]
    .sort((a, b) => {
      if (!a.sessionDate) return 1
      if (!b.sessionDate) return -1
      return new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
    })

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16" data-testid="sessions-empty-state">
        <p className="text-zinc-500 text-sm">No sessions logged yet.</p>
        <p className="text-zinc-400 text-xs mt-1">Log a session using the button in the header.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2" data-testid="group-sessions-tab">
      {sorted.map(session => (
        <Link
          key={session.id}
          to={`/groups/${groupId}/sessions/${session.id}`}
          className="bg-white rounded-xl px-4 py-3 flex items-start gap-3 hover:bg-[#F4F2FD] transition-colors"
          style={{ boxShadow: '0 4px 16px rgba(26, 27, 34, 0.05)', minHeight: '64px' }}
          data-testid="group-session-item"
        >
          {session.sessionDate && <DateBlock dateStr={session.sessionDate} />}
          <div className="flex-1 min-w-0 self-center">
            <p className="text-sm font-bold text-[#1A1B22] line-clamp-1 leading-snug">
              {session.title ?? 'Group session'}
            </p>
            {session.actualContent && (
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{session.actualContent}</p>
            )}
            {session.isCancelled && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[0.6875rem] font-bold text-red-600 mt-1">
                Cancelled
              </span>
            )}
          </div>
          {session.duration != null && (
            <span className="shrink-0 text-xs text-zinc-400 bg-zinc-50 rounded px-2 py-0.5 self-center">
              {session.duration}min
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}
