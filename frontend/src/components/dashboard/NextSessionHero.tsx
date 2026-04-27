import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import { CefrBadge } from './CefrBadge'
import type { NextSession } from '@/api/dashboard'
import { getHomeworkStatusInfoSafe } from '@/utils/homeworkStatusUtils'

interface NextSessionHeroProps {
  session: NextSession | null
}

interface UrgencyBadge {
  label: string
  className: string
  showBadge: boolean
}

function getUrgencyBadge(sessionDate: string): UrgencyBadge {
  const diff = new Date(sessionDate).getTime() - Date.now()
  if (diff <= 0) return { label: 'NOW', className: 'bg-gradient-to-br from-[#3525CD] to-indigo-500 text-white', showBadge: true }
  const mins = Math.round(diff / 60000)
  if (mins <= 120) {
    // Within 2 hours: green gradient pill
    const label = mins < 60 ? `IN ${mins} MIN` : `IN ${Math.round(mins / 60)}H`
    return { label, className: 'bg-gradient-to-br from-[#3525CD] to-indigo-500 text-white', showBadge: true }
  }
  const hrs = diff / 3600000
  if (hrs < 24) {
    // Today but not imminent: neutral
    const timeStr = new Date(sessionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return { label: `TODAY, ${timeStr}`, className: 'bg-zinc-100 text-zinc-600', showBadge: true }
  }
  const days = Math.round(diff / 86400000)
  if (days <= 7) {
    // Within a week: neutral no-frills
    return { label: `IN ${days}D`, className: 'bg-zinc-100 text-zinc-500', showBadge: true }
  }
  // More than 7 days: no badge
  return { label: '', className: '', showBadge: false }
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

// Canonical format: short month + numeric day ("Mar 28"), matching Sessions list section headers.
function formatLastSessionDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}


export function NextSessionHero({ session }: NextSessionHeroProps) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(id)
  }, [])

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

  const urgency = getUrgencyBadge(session.sessionDate)
  const hwStatus = getHomeworkStatusInfoSafe(session.previousHomeworkStatus)

  // Belt-and-suspenders: backend strips nulls/empty tags, but guard here too
  const filteredTopicTags = session.lastSessionTopicTags.filter((t) => t != null && t.trim() !== '')
  const hasTopics = filteredTopicTags.length > 0
  const hasResponse = !!session.lastSessionNotes
  const hasLastHomework = !!session.lastSessionHomework
  const hasPromises = session.lastSessionFollowups.length > 0
  const hasBriefing = hasTopics || hasResponse || hasLastHomework || hasPromises

  return (
    <div
      className="rounded-2xl bg-white p-6 shadow-[0_12px_40px_rgba(26,27,34,0.06)] ring-1 ring-[#C7C4D8]/20"
      data-testid="zone1-next-session"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {urgency.showBadge && (
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.05em] font-inter ${urgency.className}`}>
                {urgency.label}
              </span>
            )}
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter">
              {formatSessionDay(session.sessionDate)} &middot; {formatSessionTime(session.sessionDate)}
            </span>
          </div>
          <h2 className="font-manrope text-[1.75rem] font-bold text-[#1A1B22] leading-tight">
            {session.studentName}
          </h2>
          {(session.teachingLanguage || session.totalSessionCount > 0) && (
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter mt-0.5" data-testid="hero-identity-subtitle">
              {[session.teachingLanguage, session.totalSessionCount === 1 ? 'First Session' : session.totalSessionCount > 1 ? `Session #${session.totalSessionCount}` : null].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <CefrBadge level={session.studentCefrLevel} />
          <div className="flex items-center gap-3">
            <Link
              to={`/students/${session.studentId}`}
              className="inline-flex items-center rounded-xl bg-[#ECEAFD] px-3 py-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-[#3525CD] font-inter transition-colors hover:bg-[#E0DDFA]"
            >
              View profile
            </Link>
            <Link
              to={`/students/${session.studentId}/log-session`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#3525CD] to-indigo-500 px-3 py-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-white font-inter transition-opacity hover:opacity-90"
              data-testid="start-session-btn"
            >
              <Play className="h-3 w-3 fill-white" />
              Start session
            </Link>
          </div>
        </div>
      </div>

      {/* Planned content */}
      {session.plannedContent && (
        <div className="mb-5">
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter mb-1">Planned</p>
          <p className="text-sm text-[#1A1B22] font-inter">{session.plannedContent}</p>
        </div>
      )}

      {/* Last session briefing + homework card */}
      {(hasBriefing || session.homeworkAssigned) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Structured briefing */}
          {hasBriefing && (
            <div className="rounded-xl bg-[#F4F2FD] p-4 space-y-2.5">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter">
                Last session{session.lastSessionDate ? ` · ${formatLastSessionDate(session.lastSessionDate)}` : ''}
              </p>
              {hasTopics && (
                <div>
                  <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter mb-0.5">Topics</p>
                  <p className="text-sm text-[#1A1B22] font-inter">{filteredTopicTags.join(', ')}</p>
                </div>
              )}
              {hasResponse && (
                <div>
                  <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter mb-0.5">How it went</p>
                  <p className="text-sm text-[#1A1B22] font-inter">{session.lastSessionNotes}</p>
                </div>
              )}
              {hasLastHomework && (
                <div>
                  <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter mb-0.5">Homework assigned</p>
                  <p className="text-sm text-[#1A1B22] font-inter">{session.lastSessionHomework}</p>
                </div>
              )}
              {hasPromises && (
                <div>
                  <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400 font-inter mb-0.5">Promises made</p>
                  <p className="text-sm text-[#1A1B22] font-inter">{session.lastSessionFollowups.join(' · ')}</p>
                </div>
              )}
            </div>
          )}

          {/* Homework status card */}
          {session.homeworkAssigned && (
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-amber-700 font-inter mb-1">
                Homework pending &middot; <span className={hwStatus.color}>{hwStatus.label}</span>
              </p>
              <p className="text-sm text-[#1A1B22] font-inter">{session.homeworkAssigned}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
