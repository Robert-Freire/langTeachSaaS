import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, NotebookPen, Pencil, CalendarClock, Mic } from 'lucide-react'
import type { Student } from '@/api/students'
import type { SessionLog } from '@/api/sessionLogs'
import { formatDateShort } from '@/utils/formatDate'
import { getInitials } from '@/utils/nameUtils'
import { Button, buttonVariants } from '@/components/ui/button'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { getObjectiveUrgency, getDaysRemaining, formatDaysRemaining } from '@/lib/objectiveUrgency'

function buildIdentitySubtitle(student: Student): string {
  const segments: string[] = []
  if (student.languages.nativeLanguages.length > 0) {
    segments.push(`${student.languages.nativeLanguages[0]} speaker, learning ${student.learningLanguage}`)
  } else {
    segments.push(`Learning ${student.learningLanguage}`)
  }
  const profCityParts: string[] = []
  if (student.identity.profession) profCityParts.push(student.identity.profession)
  const city = student.identity.cityOfResidence ?? student.identity.cityOfOrigin
  if (city) profCityParts.push(city)
  if (profCityParts.length > 0) segments.push(profCityParts.join(', '))
  return segments.join(' · ')
}

function HeaderObjective({ student }: { student: Student }) {
  const objectives = student.profile.shortTermObjectives
  if (objectives.length === 0) return null
  const sorted = [...objectives].sort((a, b) => {
    const order = { overdue: 0, critical: 1, normal: 2 }
    const urgencyDelta =
      order[getObjectiveUrgency(a.targetDate)] - order[getObjectiveUrgency(b.targetDate)]
    if (urgencyDelta !== 0) return urgencyDelta
    const aDays = getDaysRemaining(a.targetDate)
    const bDays = getDaysRemaining(b.targetDate)
    return (aDays ?? Number.POSITIVE_INFINITY) - (bDays ?? Number.POSITIVE_INFINITY)
  })
  const obj = sorted[0]
  const urgency = getObjectiveUrgency(obj.targetDate)
  const daysRemaining = getDaysRemaining(obj.targetDate)
  return (
    <div
      className="mt-2 flex items-center gap-2 flex-wrap"
      data-testid="primary-objective-card"
    >
      <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-[#7E3000]">Goal</span>
      <span className="text-sm font-medium text-[#1A1B22] truncate max-w-xs" data-testid="objective-text">
        {obj.text}
      </span>
      {obj.targetDate && (
        <span className="flex items-center gap-1 text-xs text-zinc-500">
          <CalendarClock className="h-3 w-3 shrink-0" />
          {new Date(obj.targetDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          {daysRemaining !== null && (
            <span
              className={`font-semibold ${
                urgency === 'overdue' ? 'text-red-600' : urgency === 'critical' ? 'text-orange-600' : 'text-[#7E3000]'
              }`}
              data-testid="days-remaining"
            >
              {formatDaysRemaining(daysRemaining)}
            </span>
          )}
        </span>
      )}
      {objectives.length > 1 && (
        <span className="text-[0.6875rem] text-zinc-400">+{objectives.length - 1} more</span>
      )}
    </div>
  )
}

interface StudentDetailHeaderProps {
  onVoiceUpdateClick?: () => void
  voiceFlowActive?: boolean
  student: Student
  nextSession: SessionLog | null
  sessionFrequency: string | null
}

export function StudentDetailHeader({ student, nextSession, sessionFrequency, onVoiceUpdateClick, voiceFlowActive }: StudentDetailHeaderProps) {
  const navigate = useNavigate()
  const identitySubtitle = buildIdentitySubtitle(student)

  return (
    <div
      className="bg-white rounded-2xl p-5 lg:p-6"
      style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <Link
            to="/students"
            className="text-zinc-400 hover:text-zinc-600 transition-colors shrink-0 mt-1"
            aria-label="Back to students"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* Avatar */}
          <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-indigo-700 font-bold text-lg">
              {getInitials(student.name)}
            </span>
          </div>

          <div className="min-w-0">
            {/* Line 1: name + CEFR badge(s) */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="font-manrope text-[1.75rem] font-bold text-[#1A1B22] leading-tight truncate"
                data-testid="student-detail-name"
              >
                {student.name}
              </h1>
              <CefrBadge level={student.level.cefrLevel} data-testid="cefr-badge" />
              {student.level.officialCefrLevel && (
                <span data-testid="official-cefr-badge" className="inline-flex items-center gap-1">
                  <span className="text-[0.6875rem] text-zinc-500 uppercase tracking-[0.05em]">Official: </span>
                  <CefrBadge level={student.level.officialCefrLevel} />
                </span>
              )}
            </div>

            {/* Line 2: identity subtitle */}
            <p
              className="text-sm text-zinc-500 mt-0.5 truncate"
              data-testid="student-header-subtitle"
            >
              {identitySubtitle}
            </p>

            {/* Line 3: status badges + next session */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {student.commercial.isActive ? (
                <>
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.05em] bg-green-100 text-green-700"
                    data-testid="student-status-badge"
                  >
                    Active
                  </span>
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.05em] bg-indigo-100 text-indigo-700"
                    data-testid="student-type-badge"
                  >
                    {student.commercial.isCorporate ? 'Corporate' : 'Private'}
                  </span>
                </>
              ) : (
                <span
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.05em] bg-zinc-100 text-zinc-500"
                  data-testid="student-status-badge"
                >
                  Inactive
                </span>
              )}
              {nextSession && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-[#E8E7F1] text-[#464455]"
                  data-testid="next-session-pill"
                >
                  <span className="text-[0.6875rem]">Next:</span>{' '}
                  {formatDateShort(nextSession.sessionDate!)}
                  {nextSession.duration && ` · ${nextSession.duration}min`}
                </span>
              )}
            </div>

            {/* Session frequency */}
            {sessionFrequency && (
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-[0.6875rem] font-medium text-zinc-500 bg-[#F4F2FD]"
                data-testid="session-frequency-indicator"
              >
                {sessionFrequency}
              </span>
            )}

            {/* Primary Objective */}
            <HeaderObjective student={student} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 md:self-start">
          {onVoiceUpdateClick && (
            <Button
              onClick={onVoiceUpdateClick}
              disabled={voiceFlowActive}
              aria-label="Update via voice"
              variant="secondary"
              size="sm"
              className="rounded-xl"
              data-testid="voice-update-button"
            >
              <Mic className="h-3.5 w-3.5" />
              <span className="md:hidden lg:inline">Update via voice</span>
            </Button>
          )}
          <Link
            to={`/students/${student.id}/edit`}
            aria-label="Edit Student"
            className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'rounded-xl' })}
            data-testid="edit-profile-link"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="md:hidden lg:inline">Edit Student</span>
          </Link>
          <Button
            onClick={() => navigate(`/students/${student.id}/log-session`)}
            aria-label="Log Session"
            className="rounded-xl text-sm font-medium"
            size="sm"
            data-testid="log-session-button"
          >
            <NotebookPen className="h-4 w-4 lg:mr-1.5" />
            <span className="md:hidden lg:inline">Log Session</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
