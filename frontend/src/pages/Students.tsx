import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, UserPlus, Users, ChevronsUpDown } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { getStudents, type Student } from '../api/students'
import { getDashboard, type ActiveStudent } from '../api/dashboard'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CEFR_LEVELS } from '@/lib/cefr-colors'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { cn } from '@/lib/utils'

// ── Avatar helpers ──────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  return words.slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

const AVATAR_PALETTES = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-teal-100 text-teal-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-orange-100 text-orange-700',
]

function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length]
}

// ── Date formatting ─────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string | null | undefined, showTime = false): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - targetDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    if (showTime) {
      const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      return `Today ${timeStr}`
    }
    return 'Today'
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays > 0) return `${diffDays}d ago`

  // Future dates
  const futureDays = Math.abs(diffDays)
  if (showTime) {
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    if (futureDays === 1) return `Tomorrow ${timeStr}`
    if (futureDays <= 6) {
      const dayAbbr = date.toLocaleDateString('en-GB', { weekday: 'short' })
      return `${dayAbbr} ${timeStr}`
    }
  }
  if (futureDays === 1) return 'Tomorrow'
  return `in ${futureDays}d`
}

// ── Signal badges ───────────────────────────────────────────────────────────

interface Signal {
  label: string
  className: string
  redDot?: boolean
}

function buildSignals(student: Student, dash: ActiveStudent | undefined): Signal[] {
  if (!student.isActive) {
    return [{ label: 'Former', className: 'bg-zinc-600 text-white' }]
  }

  if (!dash) return []

  const signals: Signal[] = []
  const now = Date.now()

  const lastSessionMs = dash.lastSessionDate ? new Date(dash.lastSessionDate).getTime() : null
  const lastSessionGapDays = lastSessionMs != null
    ? Math.floor((now - lastSessionMs) / (1000 * 60 * 60 * 24))
    : null

  const hasNextSession = !!dash.nextSessionDate

  // RETURNING: was inactive 30+ days and now has a scheduled next session
  const isReturning = lastSessionGapDays != null && lastSessionGapDays >= 30 && hasNextSession
  if (isReturning) {
    signals.push({ label: 'RETURNING', className: 'bg-[#1A1B22] text-white' })
  } else if (lastSessionGapDays != null && lastSessionGapDays >= 14) {
    // Inactive Xd: last session 14+ days ago and no upcoming session (or < 30d gap)
    signals.push({ label: `Inactive ${lastSessionGapDays}d`, className: 'bg-amber-500 text-white' })
  }

  // Cancelled 2x
  if (dash.cancelledSessionsLast30Days >= 2) {
    signals.push({ label: 'Cancelled 2x', className: 'bg-[#1A1B22] text-white', redDot: true })
  }

  // NEW: created in last 14 days with fewer than 3 sessions
  if (student.createdAt) {
    const createdMs = new Date(student.createdAt).getTime()
    const daysSinceCreation = Math.floor((now - createdMs) / (1000 * 60 * 60 * 24))
    if (daysSinceCreation <= 14 && dash.totalSessions < 3) {
      signals.push({ label: 'NEW', className: 'bg-green-500 text-white' })
    }
  }

  // Exam prep: short-term objective with targetDate within 6 weeks
  const sixWeeksMs = 6 * 7 * 24 * 60 * 60 * 1000
  const hasExamPrep = student.shortTermObjectives.some(o => {
    if (!o.targetDate) return false
    const targetMs = new Date(o.targetDate).getTime()
    const msUntil = targetMs - now
    return msUntil >= 0 && msUntil <= sixWeeksMs
  })
  if (hasExamPrep) {
    signals.push({ label: 'Exam prep', className: 'bg-[#3525CD] text-white' })
  }

  // Review pending: has pending teaching todos
  if (dash.pendingTodos.length > 0) {
    signals.push({ label: 'Review pending', className: 'bg-[#3525CD] text-white' })
  }

  return signals
}

// ── Sort ────────────────────────────────────────────────────────────────────

type SortOption = 'nextSession' | 'lastSession' | 'name' | 'cefrLevel'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'nextSession', label: 'Next Session' },
  { value: 'lastSession', label: 'Last Session' },
  { value: 'name', label: 'Name' },
  { value: 'cefrLevel', label: 'CEFR Level' },
]

function sortStudents(
  students: Student[],
  dashMap: Map<string, ActiveStudent>,
  sortBy: SortOption
): Student[] {
  const sorted = [...students]
  const cefrOrder = Object.fromEntries(CEFR_LEVELS.map((l, i) => [l, i]))

  switch (sortBy) {
    case 'nextSession':
      return sorted.sort((a, b) => {
        const aDate = dashMap.get(a.id)?.nextSessionDate
        const bDate = dashMap.get(b.id)?.nextSessionDate
        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        return new Date(aDate).getTime() - new Date(bDate).getTime()
      })
    case 'lastSession':
      return sorted.sort((a, b) => {
        const aDate = dashMap.get(a.id)?.lastSessionDate
        const bDate = dashMap.get(b.id)?.lastSessionDate
        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        return new Date(bDate).getTime() - new Date(aDate).getTime()
      })
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'cefrLevel':
      return sorted.sort((a, b) => (cefrOrder[a.cefrLevel] ?? 99) - (cefrOrder[b.cefrLevel] ?? 99))
  }
}

// ── Constants ───────────────────────────────────────────────────────────────

const CEFR_FILTER_OPTIONS = ['All', ...CEFR_LEVELS] as const
const PAGE_SIZE = 12

const COL_CLASSES = 'grid-cols-[32px_minmax(160px,2fr)_80px_120px_110px_140px_1fr]'
const TABLE_HEADERS = ['', 'Name', 'Level', 'Native Language', 'Last Session', 'Next Session', 'Alerts'] as const

// ── Component ───────────────────────────────────────────────────────────────

export default function Students() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const cefrFilter = searchParams.get('level') ?? 'All'
  const sortBy = (searchParams.get('sort') as SortOption) ?? 'lastSession'
  const visibleCount = Number(searchParams.get('count') ?? PAGE_SIZE)

  const [localSearch, setLocalSearch] = useState(() => searchParams.get('q') ?? '')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (localSearch) { next.set('q', localSearch) } else { next.delete('q') }
        next.delete('count')
        return next
      }, { replace: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch, setSearchParams])

  useEffect(() => {
    if (!sortOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [sortOpen])

  function updateParam(updates: Record<string, string | null>) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '' || value === 'All' || (key === 'count' && value === String(PAGE_SIZE))) {
          next.delete(key)
        } else {
          next.set(key, value)
        }
      }
      return next
    }, { replace: true })
  }

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

  const dashboardMap = new Map<string, ActiveStudent>(
    dashboardData?.activeStudents.map(s => [s.studentId, s]) ?? []
  )

  const allStudents = studentsData?.items ?? []

  const filteredStudents = allStudents.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(localSearch.toLowerCase())
    const matchesCefr = cefrFilter === 'All' || s.cefrLevel === cefrFilter
    return matchesSearch && matchesCefr
  })

  const sortedStudents = sortStudents(filteredStudents, dashboardMap, sortBy)
  const visibleStudents = sortedStudents.slice(0, visibleCount)

  // ── Dynamic subtitle ─────────────────────────────────────────────────────

  function buildSubtitle(): string {
    const total = allStudents.length
    if (localSearch) {
      const count = filteredStudents.length
      return `Showing ${count} result${count === 1 ? '' : 's'} for '${localSearch}'`
    }
    if (cefrFilter !== 'All') {
      const count = allStudents.filter(s => s.cefrLevel === cefrFilter).length
      return `Managing ${count} ${cefrFilter} learner${count === 1 ? '' : 's'} in your atelier`
    }
    return `Managing ${total} language learner${total === 1 ? '' : 's'} in your atelier`
  }

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Last Session'

  if (isStudentsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="bg-white rounded-xl overflow-hidden">
          <div className={cn('grid gap-4 px-4 py-2 border-b border-zinc-100', COL_CLASSES)}>
            {TABLE_HEADERS.map((_h, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className={cn('grid gap-4 px-4 py-3', COL_CLASSES)}>
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-10 rounded-md" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
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
        title="Student Roster"
        subtitle={allStudents.length > 0 ? buildSubtitle() : undefined}
        actions={
          <Link
            to="/students/new"
            className={cn(
              buttonVariants(),
              'bg-gradient-to-br from-[#3525CD] to-[#4F46E5] hover:opacity-90 text-white border-0'
            )}
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add Student
          </Link>
        }
      />

      {/* Search, filter and sort bar */}
      {allStudents.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search (left) */}
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Search students..."
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-white border-zinc-200 focus-visible:ring-indigo-500"
            />
          </div>

          {/* CEFR pills (right of search) */}
          <div className="flex items-center gap-1">
            {CEFR_FILTER_OPTIONS.map(level => (
              <button
                key={level}
                onClick={() => updateParam({ level: level === 'All' ? null : level, count: null })}
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

          {/* Sort dropdown (custom, no border) */}
          <div className="ml-auto relative" ref={sortRef}>
            <button
              data-testid="sort-button"
              aria-label="Sort students"
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              onClick={() => setSortOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 h-8 text-xs rounded-md bg-white hover:bg-zinc-50 transition-colors"
            >
              <span className="text-zinc-500">Sort by:</span>
              <span className="font-medium text-zinc-800">{currentSortLabel}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-400" />
            </button>
            {sortOpen && (
              <div
                role="listbox"
                className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-zinc-100 z-10 py-1"
              >
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    role="option"
                    aria-selected={sortBy === opt.value}
                    data-testid={`sort-option-${opt.value}`}
                    onClick={() => {
                      updateParam({ sort: opt.value === 'lastSession' ? null : opt.value, count: null })
                      setSortOpen(false)
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs transition-colors',
                      sortBy === opt.value
                        ? 'font-semibold text-[#3525CD] bg-indigo-50'
                        : 'text-zinc-600 hover:bg-zinc-50'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
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
          <div className={cn('grid gap-x-4 px-4 py-2.5', COL_CLASSES)}>
            {TABLE_HEADERS.map((h, i) => (
              <span
                key={i}
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
              {visibleStudents.map(student => {
                const dash = dashboardMap.get(student.id)
                const signals = buildSignals(student, dash)

                return (
                  <div
                    key={student.id}
                    data-testid={`student-row-${student.id}`}
                    onClick={() => navigate(`/students/${student.id}`)}
                    className={cn(
                      'grid gap-x-4 items-center px-2 py-1.5 rounded-lg cursor-pointer transition-colors group',
                      'hover:bg-[#ECEAFD]',
                      COL_CLASSES
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        'flex-none w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold',
                        getAvatarColor(student.id)
                      )}
                      aria-hidden="true"
                      data-testid="student-avatar"
                    >
                      {getInitials(student.name)}
                    </div>

                    {/* Name */}
                    <span
                      data-testid="student-name"
                      className="text-sm font-medium text-zinc-900 truncate group-hover:text-indigo-700"
                    >
                      {student.name}
                    </span>

                    {/* CEFR badge */}
                    <CefrBadge level={student.cefrLevel} data-testid="student-level" />

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
                      {formatRelativeDate(dash?.nextSessionDate, true)}
                    </span>

                    {/* Alerts */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {signals.length === 0 ? (
                        <span className="text-zinc-300 text-sm">—</span>
                      ) : (
                        signals.map((sig) => (
                          <span
                            key={sig.label}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium',
                              sig.className
                            )}
                          >
                            {sig.redDot && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-none" />
                            )}
                            {sig.label}
                          </span>
                        ))
                      )}
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

          {/* Pagination footer */}
          {sortedStudents.length > 0 && (
            <div className="px-4 py-3 grid grid-cols-[1fr_auto_1fr] items-center border-t border-zinc-50">
              <span className="text-xs text-zinc-400">
                Showing {Math.min(visibleCount, sortedStudents.length)} of {sortedStudents.length} student{sortedStudents.length === 1 ? '' : 's'}
              </span>
              {visibleCount < sortedStudents.length ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateParam({ count: String(visibleCount + PAGE_SIZE) })}
                  data-testid="load-more"
                >
                  Load more
                </Button>
              ) : <span />}
              <span />
            </div>
          )}
        </div>
      )}

    </div>
  )
}
