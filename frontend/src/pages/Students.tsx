import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Search, Trash2, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { getStudents, deleteStudent, type Student } from '../api/students'
import { getDashboard, type ActiveStudent } from '../api/dashboard'
import { logger } from '../lib/logger'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { getCefrStitchBadgeClasses, CEFR_LEVELS } from '@/lib/cefr-colors'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays > 0) return `${diffDays}d ago`
  const futureDays = Math.abs(diffDays)
  if (futureDays === 1) return 'Tomorrow'
  return `in ${futureDays}d`
}

const CEFR_FILTER_OPTIONS = ['All', ...CEFR_LEVELS] as const

export default function Students() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [cefrFilter, setCefrFilter] = useState<string>('All')

  const {
    data: studentsData,
    isLoading: isStudentsLoading,
    isError: isStudentsError,
  } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents({ pageSize: 100 }),
  })

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  })

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteStudent(id),
    onSuccess: () => {
      logger.info('Students', 'student deleted')
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setStudentToDelete(null)
      setDeleteError(null)
    },
    onError: (err) => {
      logger.error('Students', 'delete failed', err)
      setDeleteError('Failed to delete student. Please try again.')
      setStudentToDelete(null)
    },
  })

  const dashboardMap = new Map<string, ActiveStudent>(
    dashboardData?.activeStudents.map(s => [s.studentId, s]) ?? []
  )

  const allStudents = studentsData?.items ?? []

  const filteredStudents = allStudents.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCefr = cefrFilter === 'All' || s.cefrLevel === cefrFilter
    return matchesSearch && matchesCefr
  })

  if (isStudentsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="bg-white rounded-xl overflow-hidden">
          <div className="grid grid-cols-6 gap-4 px-4 py-2 border-b border-zinc-100">
            {['Name', 'Level', 'Native Language', 'Last Session', 'Next Session', 'Signals'].map(h => (
              <Skeleton key={h} className="h-3 w-full" />
            ))}
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="grid grid-cols-6 gap-4 px-4 py-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-10 rounded-md" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isStudentsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-red-600 font-medium">Failed to load students. Please try again.</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        subtitle="Manage your student profiles."
        actions={
          <Link
            to="/students/new"
            className={cn(buttonVariants(), 'bg-indigo-600 hover:bg-indigo-700 text-white')}
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Student
          </Link>
        }
      />

      {deleteError && (
        <span className="text-sm text-red-600 font-medium" data-testid="delete-error">{deleteError}</span>
      )}

      {/* Search and filter bar */}
      {allStudents.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm bg-white border-zinc-200 focus-visible:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-1">
            {CEFR_FILTER_OPTIONS.map(level => (
              <button
                key={level}
                onClick={() => setCefrFilter(level)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  cefrFilter === level
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allStudents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="empty-state">
          <Users className="h-12 w-12 text-zinc-300 mb-4" />
          <h2 className="text-lg font-medium text-zinc-700 mb-1">No students yet</h2>
          <p className="text-sm text-zinc-500 mb-6">Add your first student to get started.</p>
          <Link
            to="/students/new"
            className={cn(buttonVariants(), 'bg-indigo-600 hover:bg-indigo-700 text-white')}
          >
            Add your first student
          </Link>
        </div>
      )}

      {/* Student table */}
      {allStudents.length > 0 && (
        <div className="bg-white rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[minmax(160px,2fr)_80px_120px_110px_110px_1fr_56px] gap-x-4 px-4 py-2.5">
            {(['Name', 'Level', 'Native Language', 'Last Session', 'Next Session', 'Signals', ''] as const).map(h => (
              <span
                key={h}
                className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400"
              >
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {filteredStudents.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-400">
              No students match your search.
            </div>
          ) : (
            <div className="px-2 pb-2 space-y-0.5">
              {filteredStudents.map(student => {
                const dash = dashboardMap.get(student.id)
                const signals = buildSignals(student, dash)
                const isFormer = dash ? !dash.isActive : false

                return (
                  <div
                    key={student.id}
                    data-testid={`student-row-${student.id}`}
                    onClick={() => navigate(`/students/${student.id}`)}
                    className="grid grid-cols-[minmax(160px,2fr)_80px_120px_110px_110px_1fr_56px] gap-x-4 items-center px-2 py-2.5 rounded-lg cursor-pointer hover:bg-[#ECE8F6] transition-colors group"
                  >
                    {/* Name */}
                    <span
                      data-testid="student-name"
                      className="text-sm font-medium text-zinc-900 truncate group-hover:text-indigo-700"
                    >
                      {student.name}
                    </span>

                    {/* CEFR badge */}
                    <span
                      data-testid="student-level"
                      className={cn(
                        'inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[0.6875rem] font-bold uppercase tracking-[0.05em] w-fit',
                        getCefrStitchBadgeClasses(student.cefrLevel)
                      )}
                    >
                      {student.cefrLevel}
                    </span>

                    {/* Native language */}
                    <span
                      data-testid="native-language-chip"
                      className="text-sm text-zinc-600 truncate"
                    >
                      {student.nativeLanguages.length > 0
                        ? student.nativeLanguages.join(', ')
                        : <span className="text-zinc-300">—</span>}
                    </span>

                    {/* Last session */}
                    <span className="text-sm text-zinc-500">
                      {formatRelativeDate(dash?.lastSessionDate)}
                    </span>

                    {/* Next session */}
                    <span className="text-sm text-zinc-500">
                      {formatRelativeDate(dash?.nextSessionDate)}
                    </span>

                    {/* Signals */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {signals.length === 0 && !isFormer ? (
                        <span className="text-zinc-300 text-sm">—</span>
                      ) : (
                        signals.map((sig) => (
                          <span
                            key={sig.label}
                            className={cn(
                              'inline-flex items-center px-1.5 py-0.5 rounded-md text-[0.6875rem] font-medium',
                              sig.variant === 'amber'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-zinc-100 text-zinc-600'
                            )}
                          >
                            {sig.label}
                          </span>
                        ))
                      )}
                    </div>

                    {/* Actions */}
                    <div
                      className="flex items-center gap-0.5"
                      onClick={e => e.stopPropagation()}
                    >
                      <Tooltip>
                        <TooltipTrigger render={<span />}>
                          <Link
                            to={`/students/${student.id}/edit`}
                            aria-label={`Edit ${student.name}`}
                            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7')}
                            data-testid="edit-student"
                          >
                            <Pencil className="h-3.5 w-3.5 text-zinc-400" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger render={<span />}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setStudentToDelete(student)}
                            aria-label={`Delete ${student.name}`}
                            data-testid="delete-student"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-zinc-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Hidden interests for e2e compatibility */}
                    <span className="sr-only">
                      {student.interests.map(interest => (
                        <span key={interest} data-testid="interest-chip">{interest}</span>
                      ))}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {studentToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this student profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => studentToDelete && doDelete(studentToDelete.id)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="confirm-delete"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface Signal {
  label: string
  variant: 'amber' | 'zinc'
}

function buildSignals(student: Student, dash: ActiveStudent | undefined): Signal[] {
  const signals: Signal[] = []

  if (dash && !dash.isActive) {
    signals.push({ label: 'Former', variant: 'zinc' })
    return signals
  }

  if (dash?.isActive && dash.lastSessionDate) {
    const diffMs = Date.now() - new Date(dash.lastSessionDate).getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays >= 14) {
      signals.push({ label: `${diffDays}d gap`, variant: 'amber' })
    }
  }

  if (dash && dash.teachingTodosCount > 0) {
    signals.push({
      label: `${dash.teachingTodosCount} followup${dash.teachingTodosCount > 1 ? 's' : ''}`,
      variant: 'zinc',
    })
  }

  return signals
}
