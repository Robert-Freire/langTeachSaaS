import { Link } from 'react-router-dom'
import { CefrBadge } from './CefrBadge'
import type { TodaySession } from '@/api/dashboard'

interface TodayAgendaProps {
  sessions: TodaySession[]
  nextSessionId: string | null
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function TodayAgenda({ sessions, nextSessionId }: TodayAgendaProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgba(26,27,34,0.06)] ring-1 ring-[#C7C4D8]/20" data-testid="zone2-today-agenda">
      <h3 className="font-manrope text-[1.25rem] font-bold text-[#1A1B22] mb-4">Today's Agenda</h3>

      {sessions.length === 0 ? (
        <p className="text-sm text-zinc-400 font-inter py-4 text-center">No sessions today</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => {
            const isNext = session.sessionLogId === nextSessionId
            return (
              <Link
                key={session.sessionLogId}
                to={`/students/${session.studentId}`}
                className={[
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F4F2FD]',
                  isNext ? 'border-l-[3px] border-l-indigo-600 bg-[#ECEAFD]' : '',
                ].join(' ')}
              >
                <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter w-12 shrink-0">
                  {formatTime(session.sessionDate)}
                </span>
                <span className="flex-1 text-sm font-medium text-[#1A1B22] font-inter truncate">
                  {session.studentName}
                </span>
                <CefrBadge level={session.studentCefrLevel} />
                {session.plannedContent && (
                  <span className="hidden sm:block text-xs text-zinc-400 font-inter truncate max-w-[120px]">
                    {session.plannedContent}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
