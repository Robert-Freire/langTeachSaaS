import { CalendarClock } from 'lucide-react'
import type { Student } from '@/api/students'
import type { TeacherFollowup } from '@/api/followups'
import { TeachingTodosCard } from './TeachingTodosCard'
import { StudentFollowupsCard } from './StudentFollowupsCard'
import { getObjectiveUrgency, getDaysRemaining, formatDaysRemaining } from '@/lib/objectiveUrgency'
import { SectionHeader } from './SectionHeader'

interface Props {
  student: Student
  followups?: TeacherFollowup[]
  onFollowupChange?: () => void
}


function PrimaryObjectiveCard({ student }: { student: Student }) {
  const objectives = student.shortTermObjectives
  if (objectives.length === 0) {
    return (
      <div
        className="bg-white rounded-2xl px-6 py-4"
        style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
        data-testid="primary-objective-card"
      >
        <SectionHeader>Primary Objective</SectionHeader>
        <p className="text-sm text-zinc-400 italic">No objectives set</p>
      </div>
    )
  }

  // Show the first (most urgent) objective -- sorted: overdue first, then critical, then normal
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
      className="bg-white rounded-2xl p-6"
      style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
      data-testid="primary-objective-card"
    >
      <SectionHeader>Primary Objective</SectionHeader>
      <div
        className={`rounded-xl p-4 ${
          urgency === 'overdue'
            ? 'border-2 border-red-300 bg-red-50'
            : urgency === 'critical'
              ? 'border-2 border-orange-300 bg-orange-50'
              : 'border border-zinc-200 bg-zinc-50'
        }`}
        data-testid="objective-item"
      >
        <p className="text-sm font-medium text-[#1A1B22] leading-snug" data-testid="objective-text">
          {obj.text}
        </p>
        {obj.targetDate && (
          <div className="flex items-center gap-2 mt-2">
            <CalendarClock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="text-xs text-zinc-500">
              {new Date(obj.targetDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            {daysRemaining !== null && (
              <span
                className={`text-xs font-semibold ${
                  urgency === 'overdue'
                    ? 'text-red-600'
                    : urgency === 'critical'
                      ? 'text-orange-600'
                      : 'text-zinc-500'
                }`}
                data-testid="days-remaining"
              >
                {formatDaysRemaining(daysRemaining)}
              </span>
            )}
          </div>
        )}
      </div>

      {objectives.length > 1 && (
        <p className="text-xs text-zinc-400 mt-2">
          +{objectives.length - 1} more {objectives.length - 1 === 1 ? 'objective' : 'objectives'}
        </p>
      )}
    </div>
  )
}

export function StudentOverviewTab({ student, followups = [], onFollowupChange }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" data-testid="student-overview-tab">
      {/* Main column (3/5) */}
      <div className="lg:col-span-3 space-y-6">
        <PrimaryObjectiveCard student={student} />
      </div>

      {/* Side column (2/5) */}
      <div className="lg:col-span-2 space-y-6">
        <div
          className="bg-white rounded-2xl p-6"
          style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
        >
          <SectionHeader>Teaching Todos</SectionHeader>
          <TeachingTodosCard todos={student.teachingTodos} />
        </div>

        <div
          className="bg-white rounded-2xl p-6"
          style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
        >
          <StudentFollowupsCard
            followups={followups}
            studentId={student.id}
            onFollowupChange={onFollowupChange ?? (() => {})}
          />
        </div>
      </div>
    </div>
  )
}
