import { useCallback, useRef, useState } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, NotebookPen, Pencil, CalendarClock } from 'lucide-react'
import { getStudent, updateStudent } from '../api/students'
import type { Student } from '../api/students'
import { logger } from '../lib/logger'
import { newId } from '@/lib/newId'
import { getFollowups } from '@/api/followups'
import { listSessions } from '@/api/sessionLogs'
import type { SessionLog } from '@/api/sessionLogs'
import { formatDateShort } from '@/utils/formatDate'
import { getInitials } from '@/utils/nameUtils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { StudentProfileTab } from '@/components/student/StudentProfileTab'
import { StudentOverviewTab } from '@/components/student/StudentOverviewTab'
import { SessionHistoryTab } from '@/components/session/SessionHistoryTab'
import { ProgressDashboard } from '@/components/student/ProgressDashboard'
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
  return segments.join(' \u00b7 ')
}

function calcSessionFrequency(sessions: SessionLog[]): string | null {
  const past = sessions
    .filter(s => !s.isCancelled && s.sessionDate && s.statusName === 'Confirmed' && new Date(s.sessionDate) <= new Date())
    .sort((a, b) => new Date(a.sessionDate!).getTime() - new Date(b.sessionDate!).getTime())
  if (past.length === 0) return null
  if (past.length === 1) return '1 session'
  const first = new Date(past[0].sessionDate!)
  const last = new Date(past[past.length - 1].sessionDate!)
  const spanDays = Math.round((last.getTime() - first.getTime()) / 86400000)
  if (spanDays < 14) return `${past.length} sessions`
  const weeks = Math.max(1, Math.round(spanDays / 7))
  const avgDays = Math.round(spanDays / (past.length - 1))
  const weekLabel = weeks === 1 ? '1 week' : `${weeks} weeks`
  return `${past.length} sessions in ${weekLabel} \u00b7 avg. every ${avgDays} days`
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

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'overview'
  const [difficultyToggleError, setDifficultyToggleError] = useState<string | null>(null)
  const difficultyToggleAttemptRef = useRef(0)


  const { data: student, isLoading, isError } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id!),
    enabled: !!id,
  })

  const { data: followups = [], refetch: refetchFollowups } = useQuery({
    queryKey: ['followups', id],
    queryFn: () => getFollowups(id!),
    enabled: !!id,
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', id],
    queryFn: () => listSessions(id!),
    enabled: !!id,
  })

  const nextSession = sessions
    .filter(s => s.sessionDate && new Date(s.sessionDate) > new Date() && !s.isCancelled && s.statusName === 'Confirmed')
    .sort((a, b) => new Date(a.sessionDate!).getTime() - new Date(b.sessionDate!).getTime())[0] ?? null

  const onFollowupChange = useCallback(() => { refetchFollowups() }, [refetchFollowups])
  const onStudentChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['student', id] })
  }, [queryClient, id])

  function buildStudentPayload() {
    if (!student) throw new Error('Student not loaded')
    return {
      name: student.name,
      learningLanguage: student.learningLanguage,
      cefrLevel: student.level.cefrLevel,
      interests: student.profile.interests,
      nativeLanguages: student.languages.nativeLanguages,
      learningGoals: student.profile.learningGoals,
      weaknesses: student.profile.weaknesses,
      difficulties: student.profile.difficulties,
      personalNotes: student.profile.personalNotes,
      teachingNotes: student.profile.teachingNotes,
      birthYear: student.identity.birthYear,
      profession: student.identity.profession,
      countryOfOrigin: student.identity.countryOfOrigin,
      cityOfOrigin: student.identity.cityOfOrigin,
      countryOfResidence: student.identity.countryOfResidence,
      cityOfResidence: student.identity.cityOfResidence,
      reasonForStudying: student.identity.reasonForStudying,
      officialCefrLevel: student.level.officialCefrLevel,
      shortTermObjectives: student.profile.shortTermObjectives,
      isActive: student.commercial.isActive,
      isCorporate: student.commercial.isCorporate,
      rate: student.commercial.rate,
      spokenLanguages: student.languages.spokenLanguages,
      skillLevelOverrides: student.level.skillLevelOverrides,
      teachingTodos: student.profile.teachingTodos,
    }
  }

  const { mutate: toggleDifficultyStatus } = useMutation({
    onMutate: () => {
      const attempt = ++difficultyToggleAttemptRef.current
      setDifficultyToggleError(null)
      return { attempt }
    },
    mutationFn: (vars: { difficultyId: string; status: 'Active' | 'Covered' }) => {
      const updated = student!.profile.difficulties.map((d) =>
        d.id === vars.difficultyId ? { ...d, status: vars.status } : d
      )
      return updateStudent(id!, { ...buildStudentPayload(), difficulties: updated })
    },
    onSuccess: (_data, _vars, context) => {
      if (context?.attempt === difficultyToggleAttemptRef.current) {
        setDifficultyToggleError(null)
      }
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err, _vars, context) => {
      logger.error('StudentDetail', 'Failed to update difficulty status', err)
      if (context?.attempt !== difficultyToggleAttemptRef.current) return
      setDifficultyToggleError('Could not update difficulty status. Please try again.')
    },
  })

  const { mutateAsync: saveReasonForStudying } = useMutation({
    mutationFn: (value: string) =>
      updateStudent(id!, { ...buildStudentPayload(), reasonForStudying: value || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err) => {
      logger.error('StudentDetail', 'Failed to update reason for studying', err)
    },
  })

  const { mutateAsync: saveInterests } = useMutation({
    mutationFn: (value: string[]) =>
      updateStudent(id!, { ...buildStudentPayload(), interests: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err) => {
      logger.error('StudentDetail', 'Failed to update interests', err)
    },
  })

  const { mutateAsync: saveTeachingNotes } = useMutation({
    mutationFn: (value: string) =>
      updateStudent(id!, { ...buildStudentPayload(), teachingNotes: value || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err) => {
      logger.error('StudentDetail', 'Failed to update teaching notes', err)
    },
  })

  const { mutateAsync: saveLearningGoal } = useMutation({
    mutationFn: (text: string) => {
      const newGoal = { id: newId(), text, children: [] }
      return updateStudent(id!, { ...buildStudentPayload(), learningGoals: [...student!.profile.learningGoals, newGoal] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err) => {
      logger.error('StudentDetail', 'Failed to add learning goal', err)
    },
  })

  const { mutateAsync: saveShortTermObjective } = useMutation({
    mutationFn: (text: string) => {
      const newObj = { id: newId(), text, targetDate: null, objectiveType: 'other' as const }
      return updateStudent(id!, { ...buildStudentPayload(), shortTermObjectives: [...student!.profile.shortTermObjectives, newObj] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err) => {
      logger.error('StudentDetail', 'Failed to add objective', err)
    },
  })

  const { mutateAsync: saveDifficulty } = useMutation({
    mutationFn: ({ competency, description }: { competency: string; description: string }) => {
      const newDiff = { id: newId(), competency, description, subcategory: '', severity: 'medium', trend: 'stable', status: 'Active' }
      return updateStudent(id!, { ...buildStudentPayload(), difficulties: [...student!.profile.difficulties, newDiff] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err) => {
      logger.error('StudentDetail', 'Failed to add difficulty', err)
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-6 w-12 rounded-md" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  if (isError || !student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="font-manrope text-[1.75rem] font-bold text-[#1A1B22]">Student not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/students')}>
          Go back
        </Button>
      </div>
    )
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'profile', label: 'Profile' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'progress', label: 'Progress' },
  ]

  const identitySubtitle = buildIdentitySubtitle(student)
  const sessionFrequency = calcSessionFrequency(sessions)

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div
        className="bg-white rounded-2xl p-5 lg:p-6"
        style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              to="/students"
              className="text-zinc-400 hover:text-zinc-600 transition-colors shrink-0"
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

              {/* Line 2: identity subtitle (L1 speaker, learning English · Profession, City) */}
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
                    {nextSession.duration && ` \u00b7 ${nextSession.duration}min`}
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

              {/* Primary Objective — compact, in header */}
              <HeaderObjective student={student} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/students/${student.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
              data-testid="edit-profile-link"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Student
            </Link>
            <Button
              onClick={() => navigate(`/students/${student.id}/log-session`)}
              className="rounded-xl text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #3525CD, #4F46E5)' }}
              size="sm"
              data-testid="log-session-button"
            >
              <NotebookPen className="h-4 w-4 mr-1.5" />
              Log Session
            </Button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setSearchParams({ tab: tab.key })}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.key
                ? 'text-indigo-700 bg-white'
                : 'text-zinc-500 hover:text-zinc-700 hover:bg-[#F4F2FD]'
            }`}
            style={activeTab === tab.key ? { boxShadow: '0 1px 3px rgba(26, 27, 34, 0.08)' } : undefined}
            data-testid={`tab-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <StudentOverviewTab
          student={student}
          sessions={sessions}
          followups={followups}
          onFollowupChange={onFollowupChange}
          onStudentChange={onStudentChange}
          onViewAllSessions={() => setSearchParams({ tab: 'sessions' })}
          onSaveTeachingNotes={(v) => saveTeachingNotes(v).then(() => {})}
        />
      )}

      {activeTab === 'profile' && (
        <StudentProfileTab
          student={student}
          followups={followups}
          onFollowupChange={onFollowupChange}
          onStudentChange={onStudentChange}
          difficultyToggleError={difficultyToggleError}
          onToggleDifficultyStatus={(difficultyId, status) =>
            toggleDifficultyStatus({ difficultyId, status })
          }
          onSaveReasonForStudying={(v) => saveReasonForStudying(v).then(() => {})}
          onSaveInterests={(v) => saveInterests(v).then(() => {})}
          onSaveLearningGoal={(text) => saveLearningGoal(text).then(() => {})}
          onSaveShortTermObjective={(text) => saveShortTermObjective(text).then(() => {})}
          onSaveDifficulty={(vars) => saveDifficulty(vars).then(() => {})}
        />
      )}

      {activeTab === 'sessions' && (
        <SessionHistoryTab studentId={student.id} />
      )}

      {activeTab === 'progress' && (
        <ProgressDashboard student={student} sessions={sessions} />
      )}

    </div>
  )
}
