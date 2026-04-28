import type React from 'react'
import { Link } from 'react-router-dom'
import { CefrBadge } from './CefrBadge'
import type { TodaySession, UpcomingSession } from '@/api/dashboard'

interface TodayAgendaProps {
  sessions: TodaySession[]
  nextSessionId: string | null
  upcomingThisWeek: UpcomingSession[]
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatUpcomingDate(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function TodayAgenda({ sessions, nextSessionId, upcomingThisWeek }: TodayAgendaProps) {
  if (sessions.length === 0) {
    if (upcomingThisWeek.length === 0) {
      return (
        <div className="rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgba(26,27,34,0.06)] ring-1 ring-[#C7C4D8]/20" data-testid="zone2-today-agenda">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-manrope text-[1.25rem] font-bold text-[#1A1B22]">Today's Agenda</h3>
            <Link to="#" className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 hover:text-zinc-600 font-inter transition-colors" data-testid="agenda-calendar-view">Calendar view</Link>
          </div>
          <p className="text-sm text-zinc-400 font-inter py-4 text-center">No sessions this week</p>
        </div>
      )
    }

    return (
      <div className="rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgba(26,27,34,0.06)] ring-1 ring-[#C7C4D8]/20" data-testid="zone2-today-agenda">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-2">
            <h3 className="font-manrope text-[1.25rem] font-bold text-[#1A1B22]">Today's Agenda</h3>
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter">No sessions · This Week</span>
          </div>
          <Link to="#" className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 hover:text-zinc-600 font-inter transition-colors" data-testid="agenda-calendar-view">Calendar view</Link>
        </div>
        <div className="space-y-2" data-testid="this-week-sessions">
          {upcomingThisWeek.map(session => (
            <Link
              key={session.sessionLogId}
              to={`/students/${session.studentId}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F4F2FD]"
            >
              <div className="flex flex-col items-start w-24 shrink-0">
                <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter leading-tight">
                  {formatUpcomingDate(session.sessionDate)}
                </span>
                <span className="text-[0.6875rem] text-zinc-400 font-inter leading-tight">
                  {formatTime(session.sessionDate)}
                </span>
              </div>
              <span className="flex-1 text-sm font-medium text-[#1A1B22] font-inter truncate">
                {session.studentName}
              </span>
              <CefrBadge level={session.studentCefrLevel} />
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const now = new Date()

  function sessionStatusChip(session: TodaySession, isNext: boolean): React.ReactNode {
    if (isNext) {
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-bold font-inter uppercase tracking-[0.05em] shrink-0 bg-indigo-100 text-indigo-700">
          NEXT SESSION
        </span>
      )
    }
    if (new Date(session.sessionDate) < now) {
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-bold font-inter uppercase tracking-[0.05em] shrink-0 bg-zinc-100 text-zinc-400">
          DONE
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-bold font-inter uppercase tracking-[0.05em] shrink-0 bg-zinc-100 text-zinc-500">
        SCHEDULED
      </span>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgba(26,27,34,0.06)] ring-1 ring-[#C7C4D8]/20" data-testid="zone2-today-agenda">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-manrope text-[1.25rem] font-bold text-[#1A1B22]">Today's Agenda</h3>
        <Link
          to="#"
          className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 hover:text-zinc-600 font-inter transition-colors"
          data-testid="agenda-calendar-view"
        >
          Calendar view
        </Link>
      </div>

      <div className="space-y-2">
        {sessions.map(session => {
          const isNext = session.sessionLogId === nextSessionId
          return (
            <Link
              key={session.sessionLogId}
              to={`/students/${session.studentId}`}
              className={[
                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F4F2FD]',
                isNext ? 'border-l-[3px] border-l-primary bg-[#ECEAFD]' : '',
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
              {sessionStatusChip(session, isNext)}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
