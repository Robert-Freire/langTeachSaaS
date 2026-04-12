import { useState, useCallback } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, NotebookPen, Pencil } from 'lucide-react'
import { getStudent, updateStudent } from '../api/students'
import { logger } from '../lib/logger'
import { getFollowups } from '@/api/followups'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { StudentProfileTab } from '@/components/student/StudentProfileTab'
import { StudentOverviewTab } from '@/components/student/StudentOverviewTab'
import { SessionHistoryTab } from '@/components/session/SessionHistoryTab'
import { ProgressDashboard } from '@/components/student/ProgressDashboard'
import { SessionLogDialog } from '@/components/session/SessionLogDialog'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const defaultTab = searchParams.get('tab') ?? 'overview'
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [logSessionOpen, setLogSessionOpen] = useState(false)

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

  const onFollowupChange = useCallback(() => { refetchFollowups() }, [refetchFollowups])
  const onStudentChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['student', id] })
  }, [queryClient, id])

  function buildStudentPayload() {
    if (!student) throw new Error('Student not loaded')
    return {
      name: student.name,
      learningLanguage: student.learningLanguage,
      cefrLevel: student.cefrLevel,
      interests: student.interests,
      nativeLanguages: student.nativeLanguages,
      learningGoals: student.learningGoals,
      weaknesses: student.weaknesses,
      difficulties: student.difficulties,
      personalNotes: student.personalNotes,
      teachingNotes: student.teachingNotes,
      birthYear: student.birthYear,
      profession: student.profession,
      countryOfOrigin: student.countryOfOrigin,
      cityOfOrigin: student.cityOfOrigin,
      countryOfResidence: student.countryOfResidence,
      cityOfResidence: student.cityOfResidence,
      reasonForStudying: student.reasonForStudying,
      officialCefrLevel: student.officialCefrLevel,
      shortTermObjectives: student.shortTermObjectives,
      isActive: student.isActive,
      isCorporate: student.isCorporate,
      rate: student.rate,
      spokenLanguages: student.spokenLanguages,
      teachingTodos: student.teachingTodos,
    }
  }

  const { mutate: toggleDifficultyStatus } = useMutation({
    mutationFn: (vars: { difficultyId: string; status: 'Active' | 'Covered' }) => {
      const updated = student!.difficulties.map((d) =>
        d.id === vars.difficultyId ? { ...d, status: vars.status } : d
      )
      return updateStudent(id!, { ...buildStudentPayload(), difficulties: updated })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err) => {
      logger.error('StudentDetail', 'Failed to update difficulty status', err)
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
              <h1
                className="font-manrope text-[1.75rem] font-bold text-[#1A1B22] leading-tight truncate"
                data-testid="student-detail-name"
              >
                {student.name}
              </h1>

              {/* Profession */}
              {student.profession && (
                <p
                  className="text-sm text-zinc-500 mt-0.5 truncate"
                  data-testid="student-header-profession"
                >
                  {student.profession}
                </p>
              )}

              {/* Metadata row */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {/* Teacher CEFR level */}
                <CefrBadge level={student.cefrLevel} data-testid="cefr-badge" />

                {/* Official CEFR level */}
                {student.officialCefrLevel && (
                  <span data-testid="official-cefr-badge" className="inline-flex items-center gap-1">
                    <span className="text-[0.6875rem] text-zinc-500 uppercase tracking-[0.05em]">Official: </span>
                    <CefrBadge level={student.officialCefrLevel} />
                  </span>
                )}

                {/* Learning language */}
                <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-zinc-500 font-medium">
                  {student.learningLanguage}
                </span>

                {/* Native languages */}
                {student.nativeLanguages.length > 0 && (
                  <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-zinc-400 font-medium">
                    Native: {student.nativeLanguages.join(', ')}
                  </span>
                )}

                {/* Origin / Residence compact */}
                {(student.cityOfOrigin || student.cityOfResidence) && (
                  <span
                    className="text-[0.6875rem] text-zinc-400 font-medium"
                    data-testid="student-header-location"
                  >
                    {[student.cityOfOrigin, student.cityOfResidence].filter(Boolean).join(' / ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/students/${student.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-[#1A1B22] hover:bg-[#F4F2FD] transition-colors"
              data-testid="edit-profile-link"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
            <Button
              onClick={() => setLogSessionOpen(true)}
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
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.key
                ? 'text-indigo-700 bg-white'
                : 'text-zinc-500 hover:text-zinc-700 hover:bg-white/50'
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
          followups={followups}
          onFollowupChange={onFollowupChange}
          onStudentChange={onStudentChange}
        />
      )}

      {activeTab === 'profile' && (
        <StudentProfileTab
          student={student}
          followups={followups}
          onFollowupChange={onFollowupChange}
          onStudentChange={onStudentChange}
          onToggleDifficultyStatus={(difficultyId, status) =>
            toggleDifficultyStatus({ difficultyId, status })
          }
          onSaveReasonForStudying={(v) => saveReasonForStudying(v).then(() => {})}
          onSaveInterests={(v) => saveInterests(v).then(() => {})}
        />
      )}

      {activeTab === 'sessions' && (
        <SessionHistoryTab studentId={student.id} />
      )}

      {activeTab === 'progress' && (
        <ProgressDashboard studentId={student.id} />
      )}

      {/* Session log dialog */}
      <SessionLogDialog
        studentId={student.id}
        open={logSessionOpen}
        onOpenChange={setLogSessionOpen}
      />
    </div>
  )
}
