import { Link } from 'react-router-dom'
import { CefrBadge } from './CefrBadge'
import type { NextSession } from '@/api/dashboard'

interface NextSessionHeroProps {
  session: NextSession | null
}

function formatCountdown(sessionDate: string): string {
  const diff = new Date(sessionDate).getTime() - Date.now()
  if (diff <= 0) return 'NOW'
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `IN ${mins} MIN`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `IN ${hrs}H`
  const days = Math.round(hrs / 24)
  return `IN ${days}D`
}

function formatSessionTime(sessionDate: string): string {
  return new Date(sessionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatSessionDay(sessionDate: string): string {
  const d = new Date(sessionDate)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

function formatLastSessionDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function homeworkStatusLabel(status: string | null): { label: string; color: string } {
  if (!status || status === '0' || status === 'Unknown' || status === 'NotApplicable') return { label: 'No record', color: 'text-zinc-400' }
  if (status === '3' || status === 'Done') return { label: 'Completed', color: 'text-emerald-600' }
  if (status === '2' || status === 'Partial') return { label: 'Partial', color: 'text-amber-600' }
  if (status === '1' || status === 'NotDone') return { label: 'Not done', color: 'text-red-600' }
  return { label: status, color: 'text-zinc-500' }
}

export function NextSessionHero({ session }: NextSessionHeroProps) {
  if (!session) {
    return (
      <div
        className="rounded-2xl bg-white p-8 shadow-[0_12px_40px_rgba(26,27,34,0.06)] ring-1 ring-[#C7C4D8]/20 flex flex-col items-center justify-center min-h-[160px] text-center"
        data-testid="zone1-empty"
      >
        <p className="font-manrope text-[1.75rem] font-bold text-[#1A1B22]">No sessions scheduled</p>
        <p className="text-sm text-zinc-500 mt-2">Your next session will appear here once scheduled.</p>
      </div>
    )
  }

  const hwStatus = homeworkStatusLabel(session.previousHomeworkStatus)

  return (
    <div
      className="rounded-2xl bg-white p-6 shadow-[0_12px_40px_rgba(26,27,34,0.06)] ring-1 ring-[#C7C4D8]/20"
      data-testid="zone1-next-session"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="inline-flex items-center rounded-full bg-gradient-to-br from-[#3525CD] to-indigo-500 px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-white font-inter">
              {formatCountdown(session.sessionDate)}
            </span>
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter">
              {formatSessionDay(session.sessionDate)} &middot; {formatSessionTime(session.sessionDate)}
            </span>
          </div>
          <h2 className="font-manrope text-[1.75rem] font-bold text-[#1A1B22] leading-tight">
            {session.studentName}
          </h2>
        </div>
        <div className="flex flex-col items-end gap-2">
          <CefrBadge level={session.studentCefrLevel} />
          <Link
            to={`/students/${session.studentId}`}
            className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-indigo-600 hover:text-indigo-800 font-inter transition-colors"
          >
            View profile
          </Link>
        </div>
      </div>

      {/* Planned content */}
      {session.plannedContent && (
        <div className="mb-5">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter mb-1">Planned</p>
          <p className="text-sm text-[#1A1B22] font-inter">{session.plannedContent}</p>
        </div>
      )}

      {/* Briefing grid */}
      {(session.lastSessionNotes || session.homeworkAssigned) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-[#F4F2FD] p-4">
          {session.lastSessionNotes && (
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter mb-1">
                Last session{session.lastSessionDate ? ` · ${formatLastSessionDate(session.lastSessionDate)}` : ''}
              </p>
              <p className="text-sm text-[#1A1B22] font-inter">{session.lastSessionNotes}</p>
            </div>
          )}
          {session.homeworkAssigned && (
            <div>
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter mb-1">
                Homework &middot; <span className={hwStatus.color}>{hwStatus.label}</span>
              </p>
              <p className="text-sm text-[#1A1B22] font-inter">{session.homeworkAssigned}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
