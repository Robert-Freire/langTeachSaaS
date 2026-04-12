import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Pencil,
  ExternalLink,
  PlayCircle,
  Search,
  Mic,
  CalendarDays,
  Filter,
} from 'lucide-react'
import { SessionLogDialog } from './SessionLogDialog'
import { logger } from '../../lib/logger'
import { Link } from 'react-router-dom'
import { listSessions, deleteSession, parseTopicTags, type SessionLog } from '../../api/sessionLogs'
import { formatMonthDay } from '../../utils/formatDate'
import { HOMEWORK_STATUS_INFO } from '../../utils/homeworkStatusStyles'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

const PAGE_SIZE = 15

interface SessionHistoryTabProps {
  studentId: string
}

type StatusFilter = 'all' | 'completed' | 'cancelled' | 'draft'

const TAG_CATEGORY_LABELS: Record<string, string> = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  competency: 'Competency',
  communicativeFunction: 'Comm. function',
}

function tagCategoryClass(category?: string): string {
  if (category === 'grammar') return 'bg-[#E2DFFF] text-[#3525CD]'
  if (category === 'vocabulary') return 'bg-[#D0E1FB] text-[#38485D]'
  if (category === 'competency') return 'bg-[#FFDBCC] text-[#7B2F00]'
  if (category === 'communicativeFunction') return 'bg-purple-100 text-purple-700'
  return 'bg-[#B7C8E1] text-[#0B1C30]'
}

function formatMonth(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
}

function formatDay(dateStr: string | null): string {
  if (!dateStr) return ''
  return String(new Date(dateStr).getDate())
}

function sessionTitle(session: SessionLog): string {
  if (session.title) return session.title
  if (session.sessionDate) return `Session, ${formatMonthDay(session.sessionDate)}`
  return 'Session'
}

const HW_STATUS_FALLBACK = { icon: '—', color: 'text-zinc-400', label: 'N/A' }

function SessionEntry({
  session,
  studentId,
  onEdit,
  onStartNextSession,
}: {
  session: SessionLog
  studentId: string
  onEdit: (session: SessionLog) => void
  onStartNextSession: (session: SessionLog) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { mutate: softDelete, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteSession(studentId, session.id),
    onSuccess: () => {
      setDeleteOpen(false)
      setDeleteError(null)
      queryClient.invalidateQueries({ queryKey: ['sessions', studentId] })
    },
    onError: (err) => {
      logger.error('SessionHistoryTab', 'delete session failed', err)
      setDeleteError('Failed to delete session. Please try again.')
    },
  })

  const topicTags = parseTopicTags(session.topicTags)
  const hasActionItem = Boolean(session.nextSessionTopics)
  const hasNote = Boolean(session.generalNotes)
  const hwStatus = session.previousHomeworkStatusName
  const hwInfo = (hwStatus ? HOMEWORK_STATUS_INFO[hwStatus] : undefined) ?? HW_STATUS_FALLBACK
  const isCancelled = session.isCancelled
  const isDraft = session.statusName === 'Draft'

  const cardClass = isCancelled
    ? 'bg-[#F4F2FD]/50 opacity-60 grayscale'
    : 'bg-white shadow-sm'

  return (
    <div
      className={`rounded-2xl ring-1 ring-[#C7C4D8]/10 overflow-hidden transition-all ${cardClass}`}
      data-testid="session-entry"
    >
      {/* Collapsed row / header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 hover:bg-[#F4F2FD]/40 transition-colors"
        aria-expanded={expanded}
        data-testid="session-entry-toggle"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left: date badge + title + snippet */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Date badge */}
            <div
              className={`flex flex-col items-center justify-center shrink-0 rounded-xl w-12 h-12 ${
                isCancelled ? 'bg-zinc-200 text-zinc-500' : 'bg-[#E2DFFF] text-[#3525CD]'
              }`}
            >
              <span className="text-[8px] font-bold uppercase leading-none">{formatMonth(session.sessionDate)}</span>
              <span className="text-lg font-extrabold leading-tight">{formatDay(session.sessionDate)}</span>
            </div>

            {/* Title + content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h3
                  className={`font-bold text-sm text-[#1A1B22] ${isCancelled ? 'line-through text-zinc-500' : ''}`}
                >
                  {sessionTitle(session)}
                </h3>
                {isCancelled && (
                  <span
                    className="px-2 py-0.5 rounded bg-zinc-200 text-zinc-600 text-[9px] font-bold uppercase"
                    data-testid="cancelled-badge"
                  >
                    Cancelled
                  </span>
                )}
                {isDraft && !isCancelled && (
                  <span
                    className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold uppercase"
                    data-testid="draft-badge"
                  >
                    Pending review
                  </span>
                )}
                {!isCancelled && !isDraft && (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase">
                    Completed
                  </span>
                )}
                {hasActionItem && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600" data-testid="action-item-count">
                    <span className="bg-amber-400 rounded-full w-1.5 h-1.5 shrink-0" />
                    1 action item
                    {expanded ? (
                      <ChevronUp className="h-3 w-3 shrink-0" />
                    ) : (
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    )}
                  </span>
                )}
                {hasNote && (
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-400" data-testid="general-note-count">
                    <span className="bg-zinc-300 rounded-full w-1.5 h-1.5 shrink-0" />
                    1 note
                    {expanded ? (
                      <ChevronUp className="h-3 w-3 shrink-0" />
                    ) : (
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    )}
                  </span>
                )}
              </div>

              {/* Snippet -- actualContent, hidden when expanded */}
              {!expanded && session.actualContent && (
                <p className="text-xs text-zinc-500 line-clamp-1">
                  {session.actualContent}
                </p>
              )}

              {/* Next session topics preview */}
              {!expanded && session.nextSessionTopics && (
                <p className="text-xs text-amber-700 line-clamp-1" data-testid="next-session-topics-preview">
                  <span className="font-medium">Next:</span>{' '}
                  {session.nextSessionTopics}
                </p>
              )}

              {/* Topic chips (collapsed) */}
              {!expanded && topicTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {topicTags.slice(0, 4).map((tag, i) => (
                    <span
                      key={`${tag.tag}-${i}`}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${tagCategoryClass(tag.category)}`}
                    >
                      {tag.tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: duration + mic + chevron */}
          <div className="flex items-center gap-2 shrink-0">
            {(session.duration != null || isCancelled) && (
              <span className="text-xs text-zinc-400 font-medium" data-testid="duration-badge">
                {isCancelled ? '0' : session.duration} min
              </span>
            )}
            {session.hasVoiceNote && (
              <span className="text-zinc-400" data-testid="voice-note-icon">
                <Mic className="h-4 w-4" />
              </span>
            )}
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-400" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="border-t border-[#C7C4D8]/10 p-5 bg-[#FBFAFF]"
          data-testid="session-entry-detail"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: narrative + tags + notes + planned */}
            <div className="md:col-span-2 space-y-5">
              {session.actualContent && (
                <div>
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    Session Narrative
                  </h4>
                  <p className="text-sm leading-relaxed text-[#464455] italic whitespace-pre-wrap">
                    &ldquo;{session.actualContent}&rdquo;
                  </p>
                </div>
              )}

              {/* Planned content (only if different from actual) */}
              {session.plannedContent && session.plannedContent !== session.actualContent && (
                <div>
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
                    What was planned
                  </h4>
                  <p className="text-sm text-[#1A1B22] whitespace-pre-wrap">{session.plannedContent}</p>
                </div>
              )}

              {/* Topic tags */}
              {topicTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {topicTags.map((tag, i) => {
                    const catLabel = tag.category
                      ? (TAG_CATEGORY_LABELS[tag.category] ?? tag.category)
                      : null
                    return (
                      <span
                        key={`${tag.tag}-${i}`}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold ${tagCategoryClass(tag.category)}`}
                        data-testid="topic-tag-chip"
                      >
                        {tag.tag}
                        {catLabel && <span className="opacity-60">({catLabel})</span>}
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Teacher notes */}
              {session.generalNotes && (
                <div className="p-4 rounded-xl bg-white border-l-4 border-[#4F46E5] ring-1 ring-[#C7C4D8]/10">
                  <h4 className="text-[10px] font-bold text-[#3525CD] uppercase tracking-widest mb-2">
                    Teacher Notes
                  </h4>
                  <p className="text-sm text-[#1A1B22] whitespace-pre-wrap">{session.generalNotes}</p>
                </div>
              )}

              {/* Level reassessment */}
              {session.levelReassessmentSkill && session.levelReassessmentLevel && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-0.5">Level reassessment</p>
                  <p className="text-sm text-[#1A1B22]">
                    {session.levelReassessmentSkill}: {session.levelReassessmentLevel}
                  </p>
                </div>
              )}

              {/* Linked lesson */}
              {session.linkedLessonId && (
                <Link
                  to={`/lessons/${session.linkedLessonId}`}
                  className="inline-flex items-center gap-1.5 text-xs text-[#3525CD] hover:text-[#4F46E5] font-medium"
                  data-testid="linked-lesson-link"
                >
                  <ExternalLink className="h-3 w-3" />
                  View linked lesson
                </Link>
              )}
            </div>

            {/* Right: homework + next session plan */}
            <div className="space-y-5">
              {/* Homework card */}
              {(hwStatus && hwStatus !== 'NotApplicable') || session.homeworkAssigned ? (
                <div className="bg-[#F4F2FD] p-4 rounded-2xl">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                    Homework
                  </h4>
                  <div className="space-y-3">
                    {hwStatus && hwStatus !== 'NotApplicable' && (
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight mb-1">
                          Previous Homework Status
                        </p>
                        <div className="flex items-center gap-1.5" data-testid="hw-status-badge">
                          <span className={`text-sm font-bold ${hwInfo.color}`}>{hwInfo.icon}</span>
                          <span className={`text-xs font-bold uppercase tracking-wide ${hwInfo.color}`}>
                            {hwInfo.label}
                          </span>
                        </div>
                      </div>
                    )}
                    {session.homeworkAssigned && (
                      <div className={hwStatus && hwStatus !== 'NotApplicable' ? 'pt-3 border-t border-[#C7C4D8]/20' : ''}>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight mb-1">
                          Homework Assigned
                        </p>
                        <p className="text-sm font-semibold text-[#1A1B22]">{session.homeworkAssigned}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Next session plan */}
              {session.nextSessionTopics && (
                <div
                  className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
                  data-testid="next-session-topics-section"
                >
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <CalendarDays className="h-3 w-3" />
                    Planned for next class
                  </p>
                  <p className="text-sm text-amber-900 whitespace-pre-wrap">{session.nextSessionTopics}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap justify-end gap-2 mt-5 pt-4 border-t border-[#C7C4D8]/10">
            {session.nextSessionTopics && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStartNextSession(session)}
                data-testid="start-next-session-button"
                className="text-[#3525CD] border-[#4F46E5]/30 hover:bg-[#E2DFFF] hover:text-[#3525CD]"
              >
                <PlayCircle className="h-3.5 w-3.5 mr-1" />
                Start next session
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(session)}
              data-testid="edit-session-button"
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    disabled={isDeleting}
                    data-testid="delete-session-button"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete session log?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This session record will be removed. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  {deleteError && (
                    <p className="text-xs text-red-600 w-full text-center mb-1" data-testid="delete-session-error">
                      {deleteError}
                    </p>
                  )}
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => softDelete()}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    data-testid="confirm-delete-session"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  )
}

export function SessionHistoryTab({ studentId }: SessionHistoryTabProps) {
  const [editSession, setEditSession] = useState<SessionLog | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [startNextSource, setStartNextSource] = useState<SessionLog | null>(null)
  const [startNextDialogOpen, setStartNextDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [topicFilter, setTopicFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  function handleEdit(session: SessionLog) {
    setEditSession(session)
    setEditDialogOpen(true)
  }

  function handleEditDialogChange(open: boolean) {
    setEditDialogOpen(open)
    if (!open) setEditSession(null)
  }

  function handleStartNextSession(session: SessionLog) {
    setStartNextSource(session)
    setStartNextDialogOpen(true)
  }

  function handleStartNextDialogChange(open: boolean) {
    setStartNextDialogOpen(open)
    if (!open) setStartNextSource(null)
  }

  const { data: sessions, isLoading, isError, refetch } = useQuery({
    queryKey: ['sessions', studentId],
    queryFn: () => listSessions(studentId),
  })

  const sortedSessions = useMemo(() => {
    if (!sessions) return []
    return [...sessions].sort((a, b) => {
      if (!a.sessionDate && !b.sessionDate) return 0
      if (!a.sessionDate) return -1
      if (!b.sessionDate) return 1
      return new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
    })
  }, [sessions])

  const totalHours = useMemo(() => {
    if (!sessions) return 0
    return sessions.reduce((sum, s) => {
      if (s.isCancelled || s.statusName !== 'Confirmed') return sum
      return sum + (s.duration ?? 0)
    }, 0) / 60
  }, [sessions])

  const allTopics = useMemo(() => {
    if (!sessions) return []
    const set = new Set<string>()
    for (const s of sessions) {
      for (const tag of parseTopicTags(s.topicTags)) {
        set.add(tag.tag)
      }
    }
    return Array.from(set).sort()
  }, [sessions])

  const filteredSessions = useMemo(() => {
    let result = sortedSessions

    if (statusFilter === 'completed') {
      result = result.filter((s) => !s.isCancelled && s.statusName === 'Confirmed')
    } else if (statusFilter === 'cancelled') {
      result = result.filter((s) => s.isCancelled)
    } else if (statusFilter === 'draft') {
      result = result.filter((s) => s.statusName === 'Draft' && !s.isCancelled)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (s) =>
          sessionTitle(s).toLowerCase().includes(q) ||
          (s.actualContent ?? '').toLowerCase().includes(q) ||
          (s.plannedContent ?? '').toLowerCase().includes(q),
      )
    }

    if (topicFilter) {
      result = result.filter((s) =>
        parseTopicTags(s.topicTags).some((t) => t.tag === topicFilter),
      )
    }

    if (dateFrom) {
      const from = new Date(dateFrom)
      result = result.filter((s) => s.sessionDate && new Date(s.sessionDate) >= from)
    }

    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59)
      result = result.filter((s) => s.sessionDate && new Date(s.sessionDate) <= to)
    }

    return result
  }, [sortedSessions, statusFilter, searchQuery, topicFilter, dateFrom, dateTo])

  const visibleSessions = filteredSessions.slice(0, visibleCount)
  const hasMore = filteredSessions.length > visibleCount

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4" data-testid="session-history-loading">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 space-y-2 ring-1 ring-[#C7C4D8]/10">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-3"
        data-testid="session-history-error"
      >
        <p className="text-sm text-zinc-500">Failed to load session history.</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 gap-3"
        data-testid="session-history-empty"
      >
        <p className="text-sm text-zinc-500 text-center">
          No sessions logged yet. Use &lsquo;Log session&rsquo; to record your first class.
        </p>
      </div>
    )
  }

  const statusButtons: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'draft', label: 'Draft' },
  ]

  return (
    <div className="space-y-5 pt-2">
      {/* Header stat */}
      {totalHours > 0 && (
        <div className="flex gap-4">
          <div
            className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center min-w-[120px] ring-1 ring-[#C7C4D8]/10"
            style={{ boxShadow: '0 4px 12px rgba(26,27,34,0.04)' }}
            data-testid="total-hours-stat"
          >
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Hours</p>
            <p className="text-2xl font-bold text-[#3525CD]" data-testid="total-hours-value">
              {totalHours % 1 === 0 ? totalHours.toFixed(0) : totalHours.toFixed(1)}
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 py-4 border-t border-[#C7C4D8]/10">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            className="pl-9 rounded-xl border-0 ring-1 ring-[#C7C4D8]/30 focus-visible:ring-[#3525CD]/40 bg-white text-sm"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setVisibleCount(PAGE_SIZE)
            }}
            data-testid="session-search-input"
          />
        </div>

        {/* Date range */}
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-0 ring-1 ring-[#C7C4D8]/30 bg-white text-sm font-medium gap-1.5"
                data-testid="date-range-button"
              >
                <CalendarDays className="h-4 w-4 text-zinc-400" />
                Date Range
                {(dateFrom || dateTo) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3525CD]" />
                )}
              </Button>
            }
          />
          <PopoverContent className="w-64 p-4 space-y-3" align="start">
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setVisibleCount(PAGE_SIZE) }}
                className="w-full rounded-lg border border-[#C7C4D8]/30 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3525CD]/30"
                data-testid="date-from-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setVisibleCount(PAGE_SIZE) }}
                className="w-full rounded-lg border border-[#C7C4D8]/30 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3525CD]/30"
                data-testid="date-to-input"
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-zinc-400 text-xs"
                onClick={() => { setDateFrom(''); setDateTo(''); setVisibleCount(PAGE_SIZE) }}
              >
                Clear
              </Button>
            )}
          </PopoverContent>
        </Popover>

        {/* Status filter */}
        <div className="flex bg-[#F4F2FD] p-1 rounded-xl" data-testid="status-filter">
          {statusButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(key); setVisibleCount(PAGE_SIZE) }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === key
                  ? 'bg-white text-[#3525CD] shadow-sm'
                  : 'text-zinc-500 hover:text-[#3525CD]'
              }`}
              data-testid={`status-filter-${key}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Topic filter */}
        {allTopics.length > 0 && (
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-0 ring-1 ring-[#C7C4D8]/30 bg-white text-sm font-medium gap-1.5"
                  data-testid="topic-filter-button"
                >
                  <Filter className="h-4 w-4 text-zinc-400" />
                  Topic
                  {topicFilter && <span className="w-1.5 h-1.5 rounded-full bg-[#3525CD]" />}
                </Button>
              }
            />
            <PopoverContent className="w-52 p-3" align="end">
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <button
                  onClick={() => { setTopicFilter(''); setVisibleCount(PAGE_SIZE) }}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                    !topicFilter ? 'bg-[#E2DFFF] text-[#3525CD] font-bold' : 'hover:bg-[#F4F2FD] text-zinc-600'
                  }`}
                >
                  All topics
                </button>
                {allTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => { setTopicFilter(topic); setVisibleCount(PAGE_SIZE) }}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                      topicFilter === topic ? 'bg-[#E2DFFF] text-[#3525CD] font-bold' : 'hover:bg-[#F4F2FD] text-zinc-600'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Session feed */}
      {visibleSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <p className="text-sm text-zinc-400">No sessions match your filters.</p>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#3525CD] text-xs"
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('all')
              setTopicFilter('')
              setDateFrom('')
              setDateTo('')
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3" data-testid="session-history-list">
          {visibleSessions.map((session) => (
            <SessionEntry
              key={session.id}
              session={session}
              studentId={studentId}
              onEdit={handleEdit}
              onStartNextSession={handleStartNextSession}
            />
          ))}
        </div>
      )}

      {/* Pagination footer */}
      {filteredSessions.length > 0 && (
        <footer className="flex flex-col items-center gap-3 pt-4">
          <p className="text-sm text-zinc-400 font-medium">
            Showing {visibleSessions.length} of {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}.
          </p>
          {hasMore && (
            <Button
              variant="outline"
              className="rounded-2xl px-8 bg-[#F4F2FD] border-0 text-[#3525CD] font-bold hover:bg-[#E8E7F1] gap-2"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              data-testid="load-earlier-sessions"
            >
              Load earlier sessions
            </Button>
          )}
        </footer>
      )}

      <SessionLogDialog
        studentId={studentId}
        open={editDialogOpen}
        onOpenChange={handleEditDialogChange}
        initialSession={editSession}
      />
      <SessionLogDialog
        studentId={studentId}
        open={startNextDialogOpen}
        onOpenChange={handleStartNextDialogChange}
        initialPlannedContent={startNextSource?.nextSessionTopics ?? undefined}
      />
    </div>
  )
}
