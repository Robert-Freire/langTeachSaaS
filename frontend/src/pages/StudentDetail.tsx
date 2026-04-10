import { useState } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, NotebookPen, Pencil } from 'lucide-react'
import { getStudent, updateStudent } from '../api/students'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCefrStitchBadgeClasses } from '@/lib/cefr-colors'
import { StudentProfileTab } from '@/components/student/StudentProfileTab'
import { SessionHistoryTab } from '@/components/session/SessionHistoryTab'
import { ProgressDashboard } from '@/components/student/ProgressDashboard'
import { TeachingTodosCard } from '@/components/student/TeachingTodosCard'
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
  const defaultTab = searchParams.get('tab') ?? 'profile'
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [logSessionOpen, setLogSessionOpen] = useState(false)

  const { data: student, isLoading, isError } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id!),
    enabled: !!id,
  })

  const { mutate: toggleDifficultyStatus } = useMutation({
    mutationFn: (vars: { difficultyId: string; status: 'Active' | 'Covered' }) => {
      if (!student) throw new Error('Student not loaded')
      const updated = student.difficulties.map((d) =>
        d.id === vars.difficultyId ? { ...d, status: vars.status } : d
      )
      return updateStudent(id!, {
        name: student.name,
        learningLanguage: student.learningLanguage,
        cefrLevel: student.cefrLevel,
        interests: student.interests,
        nativeLanguages: student.nativeLanguages,
        learningGoals: student.learningGoals,
        weaknesses: student.weaknesses,
        difficulties: updated,
        personalNotes: student.personalNotes,
        teachingNotes: student.teachingNotes,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
    },
    onError: (err) => {
      console.error('Failed to update difficulty status', err)
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

              {/* Metadata row */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {/* Teacher CEFR level */}
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.05em] ${getCefrStitchBadgeClasses(student.cefrLevel.substring(0, 2))}`}
                  data-testid="cefr-badge"
                >
                  {student.cefrLevel}
                </span>

                {/* Official CEFR level if different */}
                {student.officialCefrLevel && student.officialCefrLevel !== student.cefrLevel && (
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.05em] ${getCefrStitchBadgeClasses(student.officialCefrLevel.substring(0, 2))}`}
                    data-testid="official-cefr-badge"
                  >
                    Official: {student.officialCefrLevel}
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
      {activeTab === 'profile' && (
        <StudentProfileTab
          student={student}
          onToggleDifficultyStatus={(difficultyId, status) =>
            toggleDifficultyStatus({ difficultyId, status })
          }
        />
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <SessionHistoryTab studentId={student.id} />
          {student.teachingTodos.length > 0 && (
            <div
              className="bg-white rounded-2xl p-6"
              style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
            >
              <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-zinc-500 mb-3">
                Teaching Todos
              </h3>
              <TeachingTodosCard todos={student.teachingTodos} />
            </div>
          )}
        </div>
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
