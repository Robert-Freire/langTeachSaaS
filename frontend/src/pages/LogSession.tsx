import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, X, ChevronDown, ChevronUp,
  Loader2, CheckCircle, RefreshCw, Mic,
} from 'lucide-react'
import { getStudent, appendTeachingTodo, updateTeachingTodo } from '@/api/students'
import {
  getSession, listSessions, parseTopicTags, serializeTopicTags,
  type TopicTag, type CreateSessionLogRequest, type SuggestedDifficulty,
} from '@/api/sessionLogs'
import { getFollowups, createFollowup, updateFollowupStatus } from '@/api/followups'
import { getLessons } from '@/api/lessons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { TopicTagsInput } from '@/components/session/TopicTagsInput'
import { AudioRecorder } from '@/components/audio/AudioRecorder'
import { getObjectiveUrgency, getDaysRemaining } from '@/lib/objectiveUrgency'
import { suggestTopicTags } from '@/lib/suggestTopicTags'
import { formatDate as formatDateUtil, relativeTime } from '@/utils/formatDate'
import { useSessionAutosave } from '@/hooks/useSessionAutosave'
import { logger } from '@/lib/logger'

const DURATION_OPTIONS = [
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '90', label: '90 min' },
  { value: 'other', label: 'Other' },
]

const PREV_HOMEWORK_STATUSES = [
  { value: 'Done', label: 'Done' },
  { value: 'Partial', label: 'Partial' },
  { value: 'NotDone', label: 'Not Done' },
]

const CEFR_SUBLEVELS = [
  'A1.1','A1.2','A2.1','A2.2',
  'B1.1','B1.2','B2.1','B2.2',
  'C1.1','C1.2','C2.1','C2.2',
]

function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '--'
  return formatDateUtil(iso)
}

function isSuggestedDifficulty(value: unknown): value is SuggestedDifficulty {
  return (
    !!value && typeof value === 'object' &&
    typeof (value as SuggestedDifficulty).description === 'string' &&
    typeof (value as SuggestedDifficulty).competency === 'string' &&
    typeof (value as SuggestedDifficulty).subcategory === 'string' &&
    typeof (value as SuggestedDifficulty).severity === 'string'
  )
}

// Left panel section header
function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400">{label}</p>
      {children}
    </div>
  )
}

// Toggle switch component
function ToggleSwitch({
  id,
  checked,
  onChange,
  label,
  'data-testid': testId,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  'data-testid'?: string
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      data-testid={testId}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        checked ? 'bg-indigo-600' : 'bg-zinc-300'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
      <span className="sr-only">{label}</span>
    </button>
  )
}

export default function LogSession() {
  const { id, sessionId } = useParams<{ id: string; sessionId?: string }>()
  const isEditMode = !!sessionId
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const linkedLessonIdParam = searchParams.get('lessonId') ?? ''
  const queryClient = useQueryClient()

  // Form state
  const [sessionDate, setSessionDate] = useState(todayISO())
  const [durationChoice, setDurationChoice] = useState('60')
  const [durationOther, setDurationOther] = useState('')
  const [isCancelled, setIsCancelled] = useState(false)
  const [prevHomeworkStatus, setPrevHomeworkStatus] = useState<string | null>(null)
  const [actualContent, setActualContent] = useState('')
  const [homeworkAssigned, setHomeworkAssigned] = useState('')
  const [nextSessionTopics, setNextSessionTopics] = useState('')
  const [generalNotes, setGeneralNotes] = useState('')
  const [topicTags, setTopicTags] = useState<TopicTag[]>([])
  const [reassessmentEnabled, setReassessmentEnabled] = useState(false)
  const [reassessmentLevel, setReassessmentLevel] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState(linkedLessonIdParam)
  const [voiceNoteId, setVoiceNoteId] = useState<string | undefined>()
  const [secondaryOpen, setSecondaryOpen] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [suggestedDifficulties, setSuggestedDifficulties] = useState<SuggestedDifficulty[]>([])

  // Left panel interactive state
  const [checkedTodoIds, setCheckedTodoIds] = useState<Set<string>>(new Set())
  const [checkedFollowupIds, setCheckedFollowupIds] = useState<Set<string>>(new Set())
  const [mentionedDifficultyKeys, setMentionedDifficultyKeys] = useState<Set<string>>(new Set())

  // Quick-add lists (applied on Done)
  const [newTodoText, setNewTodoText] = useState('')
  const [newTodos, setNewTodos] = useState<string[]>([])
  const [newFollowupText, setNewFollowupText] = useState('')
  const [newFollowups, setNewFollowups] = useState<string[]>([])

  // Done state
  const [isDone, setIsDone] = useState(false)
  const [doneError, setDoneError] = useState<string | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  // Edit mode: track whether we've initialized form state from the fetched session
  const [didInitEdit, setDidInitEdit] = useState(false)

  // Data fetching
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id!),
    enabled: !!id,
  })

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions', id],
    queryFn: () => listSessions(id!),
    enabled: !!id,
  })

  const { data: allFollowups = [] } = useQuery({
    queryKey: ['followups', id],
    queryFn: () => getFollowups(id!),
    enabled: !!id,
  })

  const { data: lessonsData } = useQuery({
    queryKey: ['lessons', { pageSize: 100, studentId: id }],
    queryFn: () => getLessons({ pageSize: 100, studentId: id }),
    enabled: !!id,
  })

  const { data: editSession, isLoading: editSessionLoading, isError: editSessionError } = useQuery({
    queryKey: ['session', id, sessionId],
    queryFn: () => getSession(id!, sessionId!),
    enabled: isEditMode && !!id && !!sessionId,
  })

  const studentLessons = lessonsData?.items ?? []
  const nonCancelledSessions = sessions.filter(s => !s.isCancelled)

  // In edit mode, "previous session" is the one before the edited session chronologically
  const prevSession = isEditMode
    ? (() => {
        const idx = nonCancelledSessions.findIndex(s => s.id === sessionId)
        return idx >= 0 && idx + 1 < nonCancelledSessions.length
          ? nonCancelledSessions[idx + 1]
          : null
      })()
    : nonCancelledSessions[0] ?? null

  const editSessionRank = isEditMode
    ? (() => { const i = nonCancelledSessions.findIndex(s => s.id === sessionId); return i >= 0 ? nonCancelledSessions.length - i : null })()
    : null
  const sessionNumber = isEditMode ? (editSessionRank ?? '?') : nonCancelledSessions.length + 1
  const pendingFollowups = allFollowups.filter(f => f.status === 'pending')
  const activeDifficulties = student?.difficulties.filter(d => d.status === 'Active') ?? []
  const pendingTodos = student?.teachingTodos.filter(t => t.status === 'Pending') ?? []
  const showPrevHomework = (isEditMode && prevHomeworkStatus !== null) || (prevSession !== null && prevSession.homeworkAssigned !== null)
  const plannedForToday = prevSession?.nextSessionTopics ?? null

  // Pre-populate "What Happened?" from planned-for-today (create mode only)
  const [didPrefill, setDidPrefill] = useState(false)
  if (!isEditMode && !didPrefill && !sessionsLoading && plannedForToday && actualContent === '') {
    setActualContent(plannedForToday)
    setDidPrefill(true)
  }

  // Edit mode: pre-populate form state from the fetched session
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!editSession || didInitEdit) return
    setSessionDate(editSession.sessionDate?.split('T')[0] ?? todayISO())
    setActualContent(editSession.actualContent ?? '')
    setHomeworkAssigned(editSession.homeworkAssigned ?? '')
    setPrevHomeworkStatus(editSession.previousHomeworkStatusName ?? null)
    setNextSessionTopics(editSession.nextSessionTopics ?? '')
    setGeneralNotes(editSession.generalNotes ?? '')
    setIsCancelled(editSession.isCancelled)
    setTopicTags(parseTopicTags(editSession.topicTags ?? '[]'))
    setReassessmentEnabled(!!editSession.levelReassessmentSkill)
    setReassessmentLevel(editSession.levelReassessmentLevel ?? '')
    setSelectedLessonId(editSession.linkedLessonId ?? '')
    const dur = editSession.duration
    if (dur === 30 || dur === 45 || dur === 60 || dur === 90) {
      setDurationChoice(String(dur))
    } else if (dur) {
      setDurationChoice('other')
      setDurationOther(String(dur))
    }
    try {
      const pairs = JSON.parse(editSession.mentionedDifficultyPairs || '[]') as { Competency: string; Subcategory: string }[]
      setMentionedDifficultyKeys(new Set(pairs.map(p => `${p.Competency}|${p.Subcategory}`)))
    } catch { /* empty */ }
    try {
      const parsed = JSON.parse(editSession.suggestedDifficulties || '[]') as unknown[]
      setSuggestedDifficulties(Array.isArray(parsed) ? parsed.filter(isSuggestedDifficulty) : [])
    } catch { setSuggestedDifficulties([]) }
    setDidInitEdit(true)
  }, [editSession, didInitEdit])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Autosave setup - keep ref current after every render (StudentForm pattern)
  const getFormDataRef = useRef<(() => CreateSessionLogRequest) | null>(null)

  useEffect(() => {
    const dur = durationChoice === 'other'
      ? (parseInt(durationOther, 10) || null)
      : parseInt(durationChoice, 10)

    const mentionedPairs = activeDifficulties
      .filter(d => mentionedDifficultyKeys.has(`${d.competency}|${d.subcategory}`))
      .map(d => ({ Competency: d.competency, Subcategory: d.subcategory }))

    getFormDataRef.current = (): CreateSessionLogRequest => ({
      sessionDate: sessionDate || null,
      actualContent: isCancelled ? null : (actualContent || null),
      plannedContent: plannedForToday || null,
      homeworkAssigned: isCancelled ? null : (homeworkAssigned || null),
      previousHomeworkStatus: prevHomeworkStatus ?? 'NotApplicable',
      nextSessionTopics: isCancelled ? null : (nextSessionTopics || null),
      generalNotes: generalNotes || null,
      levelReassessmentSkill: reassessmentEnabled ? 'General' : null,
      levelReassessmentLevel: reassessmentEnabled ? reassessmentLevel || null : null,
      linkedLessonId: selectedLessonId || null,
      topicTags: topicTags.length > 0 ? serializeTopicTags(topicTags) : null,
      isCancelled,
      status: 'Confirmed',
      mentionedDifficultyPairs: mentionedPairs,
      suggestedDifficulties: suggestedDifficulties.length > 0 ? suggestedDifficulties : undefined,
      duration: dur,
      ...(voiceNoteId ? { voiceNoteId } : {}),
    })
  }, [
    sessionDate, durationChoice, durationOther, isCancelled, prevHomeworkStatus,
    actualContent, homeworkAssigned, nextSessionTopics, generalNotes, topicTags,
    reassessmentEnabled, reassessmentLevel, selectedLessonId, voiceNoteId,
    mentionedDifficultyKeys, activeDifficulties, plannedForToday, suggestedDifficulties,
  ])

  // Disable autosave in edit mode until the session data has loaded (prevents spurious createSession calls)
  const autosaveStudentId = isEditMode ? (editSession ? id : undefined) : id
  const { status: saveStatus, sessionId: autosavedSessionId, scheduleTextSave, saveNow } = useSessionAutosave(
    autosaveStudentId,
    getFormDataRef,
    isEditMode ? editSession?.id : undefined,
  )

  function markChangedAndSchedule() {
    setHasChanges(true)
    scheduleTextSave()
  }

  function markChangedAndSaveNow(override?: Partial<CreateSessionLogRequest>) {
    setHasChanges(true)
    void saveNow(override)
  }

  const doneNavTarget = isEditMode ? `/students/${id}?tab=sessions` : `/students/${id}`

  function handleBack() {
    if (!hasChanges && !autosavedSessionId) {
      navigate(doneNavTarget)
      return
    }
    setShowDiscardConfirm(true)
  }

  function handleDiscard() {
    setShowDiscardConfirm(false)
    navigate(doneNavTarget)
  }

  async function handleDone() {
    if (isDone) return
    setIsDone(true)
    setDoneError(null)

    try {
      // In edit mode, fall back to the URL session ID if autosave hasn't tracked it yet
      let sid = autosavedSessionId ?? (isEditMode ? sessionId ?? null : null)
      const hasSideEffects = !isCancelled && (
        checkedTodoIds.size > 0 || checkedFollowupIds.size > 0 ||
        newTodos.length > 0 || newFollowups.length > 0
      )

      // Flush any pending debounced save and ensure session exists if user made changes
      if (!sid && (hasChanges || hasSideEffects)) {
        sid = await saveNow()
        if (!sid) {
          setDoneError('Failed to save session. Please try again.')
          setIsDone(false)
          return
        }
      } else if (sid && hasChanges) {
        // Session already exists but there may be a pending debounced save — flush it
        await saveNow()
      }

      if (sid && !isCancelled) {
        await Promise.allSettled([
          ...[...checkedTodoIds].map(todoId =>
            updateTeachingTodo(id!, todoId, { status: 'Covered', coveredInSessionLogId: sid! })
          ),
          ...[...checkedFollowupIds].map(followupId =>
            updateFollowupStatus(followupId, 'done')
          ),
          ...newTodos.map(text => appendTeachingTodo(id!, text)),
          ...newFollowups.map(text => createFollowup({ text, studentId: id!, sourceSessionLogId: sid! })),
        ])
      }

      queryClient.invalidateQueries({ queryKey: ['sessions', id] })
      queryClient.invalidateQueries({ queryKey: ['student', id] })
      queryClient.invalidateQueries({ queryKey: ['followups', id] })

      navigate(doneNavTarget)
    } catch (err) {
      logger.error('LogSession', 'done handler failed', err)
      setDoneError('Something went wrong. Please try again.')
      setIsDone(false)
    }
  }

  function toggleTodo(todoId: string) {
    setCheckedTodoIds(prev => {
      const next = new Set(prev)
      if (next.has(todoId)) next.delete(todoId)
      else next.add(todoId)
      return next
    })
  }

  function toggleFollowup(followupId: string) {
    setCheckedFollowupIds(prev => {
      const next = new Set(prev)
      if (next.has(followupId)) next.delete(followupId)
      else next.add(followupId)
      return next
    })
  }

  function toggleDifficulty(key: string) {
    setMentionedDifficultyKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    markChangedAndSchedule()
  }

  function addTodo() {
    const text = newTodoText.trim()
    if (!text) return
    setNewTodos(prev => [...prev, text])
    setNewTodoText('')
  }

  function removeTodo(idx: number) {
    setNewTodos(prev => prev.filter((_, i) => i !== idx))
  }

  function addFollowup() {
    const text = newFollowupText.trim()
    if (!text) return
    setNewFollowups(prev => [...prev, text])
    setNewFollowupText('')
  }

  function removeFollowup(idx: number) {
    setNewFollowups(prev => prev.filter((_, i) => i !== idx))
  }

  // Ctrl+Enter / Cmd+Enter keyboard shortcut for Done
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !doneBusy) {
        e.preventDefault()
        void handleDone()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }) // intentionally no deps: reads doneBusy/handleDone from closure each render

  // Must be before early returns to satisfy Rules of Hooks
  const tagSuggestions = useMemo(
    () => suggestTopicTags(actualContent, topicTags),
    [actualContent, topicTags],
  )

  if (studentLoading || editSessionLoading) {
    return (
      <div className="p-8 space-y-4" data-testid="log-session-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="p-8 text-sm text-zinc-500" data-testid="log-session-not-found">
        Student not found.
      </div>
    )
  }

  if (isEditMode && (editSessionError || (!editSessionLoading && !editSession))) {
    return (
      <div className="p-8 text-sm text-zinc-500" data-testid="log-session-edit-not-found">
        Session not found.
      </div>
    )
  }

  const sortedObjectives = [...(student.shortTermObjectives)].sort((a, b) => {
    const order = { overdue: 0, critical: 1, normal: 2 }
    const ua = order[getObjectiveUrgency(a.targetDate)]
    const ub = order[getObjectiveUrgency(b.targetDate)]
    if (ua !== ub) return ua - ub
    const da = getDaysRemaining(a.targetDate) ?? Infinity
    const db = getDaysRemaining(b.targetDate) ?? Infinity
    return da - db
  })

  const doneBusy = isDone || saveStatus === 'saving'

  return (
    <div className="flex h-full min-h-0" data-testid="log-session-page">
      {/* ─── Left panel: Student Context ──────────────────────────────── */}
      <aside
        className="w-[35%] shrink-0 overflow-y-auto px-6 py-8 space-y-6"
        style={{ background: '#F4F2FD' }}
        data-testid="log-session-left-panel"
      >
        {/* Student header */}
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center rounded-xl text-white text-sm font-bold shrink-0"
            style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #3525CD, #4F46E5)' }}
            aria-hidden
          >
            {getInitials(student.name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline text-base font-bold text-[#1A1B22] leading-tight" data-testid="student-name">
                {student.name}
              </h2>
              <CefrBadge level={student.cefrLevel} data-testid="cefr-badge" />
            </div>
            {student.nativeLanguages.length > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">{student.nativeLanguages.join(', ')}</p>
            )}
            {sessionsLoading ? (
              <Skeleton className="h-3 w-20 mt-1" />
            ) : (
              <p className="text-xs text-zinc-400 mt-0.5" data-testid="session-number">Session #{sessionNumber}</p>
            )}
          </div>
        </div>

        {/* Short-term Objectives */}
        {sortedObjectives.length > 0 && (
          <PanelSection label="Short-term Objectives">
            <div className="space-y-2">
              {sortedObjectives.map(obj => {
                const urgency = getObjectiveUrgency(obj.targetDate)
                const days = getDaysRemaining(obj.targetDate)
                return (
                  <div key={obj.id} className="rounded-lg bg-white px-3 py-2.5" style={{ boxShadow: '0 1px 4px rgba(26,27,34,0.06)' }}>
                    <p className="text-sm text-[#1A1B22] leading-snug">{obj.text}</p>
                    {obj.targetDate && (
                      <p className={`text-[0.6875rem] font-bold uppercase tracking-wider mt-1 ${
                        urgency === 'overdue' ? 'text-red-600' : urgency === 'critical' ? 'text-amber-600' : 'text-zinc-400'
                      }`}>
                        {urgency === 'overdue' ? 'OVERDUE' : days !== null ? `${days}d left` : ''}
                        <span className="font-normal normal-case tracking-normal ml-1 text-zinc-400">
                          Target: {formatDate(obj.targetDate)}
                        </span>
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </PanelSection>
        )}

        {/* Teaching Todos */}
        {pendingTodos.length > 0 && (
          <PanelSection label="Teaching Todos">
            <div className="space-y-1.5">
              {pendingTodos.map(todo => (
                <label
                  key={todo.id}
                  className="flex items-start gap-2.5 cursor-pointer group"
                  data-testid="teaching-todo-item"
                >
                  <input
                    type="checkbox"
                    checked={checkedTodoIds.has(todo.id)}
                    onChange={() => toggleTodo(todo.id)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 shrink-0"
                    data-testid="teaching-todo-checkbox"
                  />
                  <span className={`text-sm leading-snug ${checkedTodoIds.has(todo.id) ? 'line-through text-zinc-400' : 'text-[#1A1B22]'}`}>
                    {todo.text}
                  </span>
                </label>
              ))}
            </div>
            {checkedTodoIds.size > 0 && (
              <p className="text-[0.6875rem] text-indigo-500 mt-1">Checked items will be marked as covered on Done</p>
            )}
          </PanelSection>
        )}

        {/* Pending Followups */}
        {pendingFollowups.length > 0 && (
          <PanelSection label="Pending Followups">
            <div className="space-y-1.5">
              {pendingFollowups.map(f => (
                <label
                  key={f.id}
                  className="flex items-start gap-2.5 cursor-pointer"
                  data-testid="followup-item"
                >
                  <input
                    type="checkbox"
                    checked={checkedFollowupIds.has(f.id)}
                    onChange={() => toggleFollowup(f.id)}
                    className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-500 shrink-0"
                    data-testid="followup-checkbox"
                  />
                  <span className={`text-sm leading-snug ${checkedFollowupIds.has(f.id) ? 'line-through text-zinc-400' : 'text-[#1A1B22]'}`}>
                    {f.text}
                    {f.dueDate && (
                      <span className="ml-1.5 text-xs text-amber-600">{formatDate(f.dueDate)}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </PanelSection>
        )}

        {/* Last Session */}
        {prevSession && (
          <PanelSection label={`Last Session (#${sessions.filter(s => !s.isCancelled).length})`}>
            <div className="rounded-lg bg-white px-3 py-2.5 space-y-1" style={{ boxShadow: '0 1px 4px rgba(26,27,34,0.06)' }}>
              <p className="text-xs text-zinc-400">{formatDate(prevSession.sessionDate)}</p>
              {prevSession.actualContent && (
                <p className="text-sm text-[#1A1B22] line-clamp-3 leading-snug">
                  {prevSession.actualContent}
                </p>
              )}
              {prevSession.homeworkAssigned && (
                <p className="text-xs text-zinc-500">
                  <span className="font-medium">HW:</span> {prevSession.homeworkAssigned}
                </p>
              )}
            </div>
          </PanelSection>
        )}

        {/* Planned for Today */}
        {plannedForToday && (
          <PanelSection label="Planned for Today">
            <div className="rounded-lg px-3 py-2.5 space-y-1" style={{ background: '#EEF0FD' }}>
              <p className="text-sm text-indigo-800 leading-snug whitespace-pre-wrap">{plannedForToday}</p>
            </div>
          </PanelSection>
        )}

        {/* Active Difficulties */}
        {activeDifficulties.length > 0 && (
          <PanelSection label="Active Difficulties">
            <div className="space-y-1.5">
              {activeDifficulties.map(d => {
                const key = `${d.competency}|${d.subcategory}`
                return (
                  <label key={d.id} className="flex items-start gap-2.5 cursor-pointer" data-testid="difficulty-item">
                    <input
                      type="checkbox"
                      checked={mentionedDifficultyKeys.has(key)}
                      onChange={() => toggleDifficulty(key)}
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 shrink-0"
                    />
                    <span className="text-sm text-[#1A1B22] leading-snug">{d.description}</span>
                  </label>
                )
              })}
            </div>
            {mentionedDifficultyKeys.size > 0 && (
              <p className="text-[0.6875rem] text-indigo-500 mt-1">Checked items will be recorded as worked on today</p>
            )}
          </PanelSection>
        )}

        {/* Suggested Difficulties (AI-extracted chips with dismiss) */}
        {suggestedDifficulties.length > 0 && (
          <PanelSection label="Suggested Difficulties">
            <p className="text-[0.6875rem] text-zinc-400 -mt-1">From session notes — remove any that look wrong</p>
            <div className="space-y-1">
              {suggestedDifficulties.map((d, i) => (
                <div
                  key={`${d.competency}|${d.subcategory}|${i}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                  data-testid="suggested-difficulty-chip"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-[#1A1B22]">{d.competency} / {d.subcategory}</span>
                    {d.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{d.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSuggestedDifficulties(prev => prev.filter((_, j) => j !== i))}
                    className="shrink-0 text-zinc-400 hover:text-zinc-700"
                    aria-label="Remove difficulty"
                    data-testid="remove-suggested-difficulty"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </PanelSection>
        )}
      </aside>

      {/* ─── Right panel: Session Log Form ───────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-h-0" data-testid="log-session-right-panel">
        <div className="px-8 py-8 space-y-6 max-w-2xl">

          {/* ── Header bar ── */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={doneBusy}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-[#1A1B22] hover:bg-[#F4F2FD] transition-colors disabled:opacity-40"
              aria-label="Back to student"
              data-testid="back-button"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            {/* Autosave status indicator */}
            <span className="text-xs flex items-center gap-1 shrink-0" data-testid="autosave-status">
              {saveStatus === 'saving' && (
                <><Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" /><span className="text-zinc-400">Saving...</span></>
              )}
              {saveStatus === 'saved' && (
                <><CheckCircle className="h-3.5 w-3.5 text-green-500" /><span className="text-zinc-500">All changes saved</span></>
              )}
              {saveStatus === 'retrying' && (
                <><RefreshCw className="h-3.5 w-3.5 text-red-500" /><span className="text-red-500">Couldn't save, retrying...</span></>
              )}
              {saveStatus === 'error' && (
                <><RefreshCw className="h-3.5 w-3.5 text-red-500" /><span className="text-red-500">Couldn't save</span></>
              )}
              {isEditMode && saveStatus === 'idle' && editSession?.updatedAt && (
                <span className="text-zinc-400">Last saved {relativeTime(editSession.updatedAt)}</span>
              )}
            </span>

            <div className="ml-auto">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDone}
                disabled={doneBusy}
                data-testid="done-btn"
              >
                {isDone ? 'Saving...' : 'Done'}
              </Button>
            </div>
          </div>

          {/* Inline discard confirmation */}
          {showDiscardConfirm && (
            <div
              className="flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-2.5 text-sm"
              data-testid="discard-confirm-bar"
            >
              <span className="text-zinc-700">You have unsaved changes. Discard this session?</span>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="text-zinc-600 hover:text-zinc-800"
                  data-testid="keep-editing-btn"
                >
                  Keep Editing
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDiscard}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  data-testid="discard-btn"
                >
                  Discard
                </Button>
              </div>
            </div>
          )}

          {/* ── Compact metadata bar: Date / Duration / Cancelled ── */}
          <div className="flex items-center gap-4 flex-wrap rounded-xl px-4 py-3" style={{ background: '#F4F2FD' }}>
            <div className="flex items-center gap-2">
              <Label htmlFor="session-date" className="text-xs font-semibold text-zinc-500 shrink-0">Date</Label>
              <Input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={e => { setSessionDate(e.target.value); markChangedAndSchedule() }}
                className="text-sm bg-white h-7 px-2 py-0 w-36"
                data-testid="session-date"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="duration" className="text-xs font-semibold text-zinc-500 shrink-0">Duration</Label>
              <Select value={durationChoice} onValueChange={(v) => { const val = v ?? durationChoice; setDurationChoice(val); markChangedAndSaveNow({ duration: val === 'other' ? null : parseInt(val, 10) }) }}>
                <SelectTrigger id="duration" className="text-sm bg-white h-7 px-2 py-0 w-28" data-testid="duration-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {durationChoice === 'other' && (
              <div className="flex items-center gap-2">
                <Label htmlFor="duration-other" className="text-xs font-semibold text-zinc-500 shrink-0">Min</Label>
                <Input
                  id="duration-other"
                  type="number"
                  min="1"
                  value={durationOther}
                  onChange={e => { setDurationOther(e.target.value); markChangedAndSchedule() }}
                  placeholder="e.g. 75"
                  className="text-sm bg-white h-7 px-2 py-0 w-20"
                  data-testid="duration-other"
                />
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <Label htmlFor="cancelled-toggle" className="text-sm text-zinc-600 cursor-pointer select-none">
                Cancelled
              </Label>
              <ToggleSwitch
                id="cancelled-toggle"
                checked={isCancelled}
                onChange={(v) => { setIsCancelled(v); markChangedAndSaveNow({ isCancelled: v }) }}
                label="Cancelled"
                data-testid="cancelled-toggle"
              />
            </div>
          </div>

          {/* ── Editorial headline + Previous HW + What Happened ── */}
          {!isCancelled && (
            <>
              <div className="space-y-0.5">
                <div className="flex items-baseline justify-between">
                  <h1 className="font-headline text-2xl font-bold text-[#1A1B22]" data-testid="page-heading">
                    {isEditMode ? 'Edit Session' : 'What Happened?'}
                  </h1>
                  <span className="text-xs text-zinc-400 shrink-0 ml-4">
                    Session #{sessionNumber}&ensp;&middot;&ensp;{formatDate(isEditMode ? editSession?.sessionDate : sessionDate)}
                  </span>
                </div>
                {!isEditMode && <p className="text-sm text-zinc-400">Reflect on the session flow and student engagement.</p>}
              </div>

              {/* Previous Homework Status */}
              {showPrevHomework && (
                <div className="space-y-1.5">
                  <p className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400">
                    Previous Homework
                  </p>
                  <div className="flex gap-2 flex-wrap" data-testid="prev-homework-status">
                    {PREV_HOMEWORK_STATUSES.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => { setPrevHomeworkStatus(s.value); markChangedAndSaveNow({ previousHomeworkStatus: s.value }) }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          prevHomeworkStatus === s.value
                            ? 'bg-indigo-600 text-white'
                            : 'bg-[#F4F2FD] text-zinc-600 hover:bg-[#E8E7F1]'
                        }`}
                        data-testid={`prev-hw-${s.value.toLowerCase()}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* What Happened textarea */}
              <div className="space-y-1">
                {plannedForToday && (
                  <div className="flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs text-indigo-700" style={{ background: '#EEF0FD' }}>
                    <span className="font-medium shrink-0">Reference:</span>
                    <span className="italic line-clamp-2">{plannedForToday}</span>
                  </div>
                )}
                <Textarea
                  id="actual-content"
                  value={actualContent}
                  onChange={e => { setActualContent(e.target.value); markChangedAndSchedule() }}
                  placeholder="Describe what happened in the session..."
                  rows={6}
                  className="resize-none text-sm bg-white"
                  data-testid="actual-content"
                />
              </div>

              {/* Topics Covered */}
              <div className="space-y-1" data-testid="topics-covered-section">
                <Label className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400">Topics Covered</Label>
                {tagSuggestions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5" data-testid="topic-tag-suggestions">
                    <span className="text-[0.6875rem] text-zinc-400 font-medium shrink-0">Suggested:</span>
                    {tagSuggestions.map(suggestion => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          const next = [...topicTags, { tag: suggestion }]
                          setTopicTags(next)
                          markChangedAndSaveNow({ topicTags: serializeTopicTags(next) })
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 hover:bg-indigo-100 transition-colors"
                        data-testid={`tag-suggestion-${suggestion}`}
                      >
                        <Plus className="h-3 w-3" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                <TopicTagsInput
                  value={topicTags}
                  onChange={(tags) => { setTopicTags(tags); markChangedAndSaveNow({ topicTags: tags.length > 0 ? serializeTopicTags(tags) : null }) }}
                />
              </div>

              {/* Homework Assigned */}
              <div className="space-y-1">
                <Label htmlFor="homework-assigned" className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400">
                  Homework Assigned
                </Label>
                <Input
                  id="homework-assigned"
                  value={homeworkAssigned}
                  onChange={e => { setHomeworkAssigned(e.target.value); markChangedAndSchedule() }}
                  placeholder="e.g. Workbook page 42, exercises 3-5"
                  className="text-sm bg-white"
                  data-testid="homework-assigned"
                />
              </div>

              {/* Next Session Plan */}
              <div className="space-y-1">
                <Label htmlFor="next-session-topics" className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400">
                  Next Session Plan
                </Label>
                <Textarea
                  id="next-session-topics"
                  value={nextSessionTopics}
                  onChange={e => { setNextSessionTopics(e.target.value); markChangedAndSchedule() }}
                  placeholder="What to focus on next time..."
                  rows={3}
                  className="resize-none text-sm bg-white"
                  data-testid="next-session-topics"
                />
              </div>

              {/* Todos + Followups side-by-side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Teaching Todos quick-add */}
                <div className="space-y-2 rounded-xl p-4" style={{ background: '#F0EFFF' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">New Teaching Todos</p>
                  {newTodos.map((text, idx) => (
                    <div key={idx} className="flex items-center gap-2" data-testid="new-todo-item">
                      <span className="flex-1 text-sm text-[#1A1B22]">{text}</span>
                      <button
                        type="button"
                        onClick={() => removeTodo(idx)}
                        className="text-zinc-400 hover:text-red-500 transition-colors"
                        aria-label="Remove todo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newTodoText}
                      onChange={e => setNewTodoText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTodo() } }}
                      placeholder="Add todo..."
                      className="text-sm bg-white flex-1"
                      data-testid="new-todo-input"
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={addTodo} className="text-indigo-600 hover:bg-indigo-50">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Followups quick-add */}
                <div className="space-y-2 rounded-xl p-4" style={{ background: '#FFFBEB' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">New Followups</p>
                  {newFollowups.map((text, idx) => (
                    <div key={idx} className="flex items-center gap-2" data-testid="new-followup-item">
                      <span className="flex-1 text-sm text-[#1A1B22]">{text}</span>
                      <button
                        type="button"
                        onClick={() => removeFollowup(idx)}
                        className="text-zinc-400 hover:text-red-500 transition-colors"
                        aria-label="Remove followup"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newFollowupText}
                      onChange={e => setNewFollowupText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFollowup() } }}
                      placeholder="Add followup..."
                      className="text-sm bg-white flex-1"
                      data-testid="new-followup-input"
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={addFollowup} className="text-amber-600 hover:bg-amber-50">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Progressive disclosure: secondary sections */}
              <button
                type="button"
                onClick={() => setSecondaryOpen(o => !o)}
                className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-indigo-600 transition-colors"
                data-testid="toggle-secondary"
              >
                {secondaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {secondaryOpen ? 'Hide extra sections' : 'Show extra sections'}
              </button>

              {secondaryOpen && (
                <div className="space-y-6">
                  {/* Voice Note - horizontal bar */}
                  <div className="flex items-center gap-4 rounded-xl px-4 py-3 bg-white" style={{ boxShadow: '0 1px 4px rgba(26,27,34,0.06)' }}>
                    <div className="flex items-center gap-2 text-zinc-600">
                      <Mic className="h-4 w-4 text-indigo-500" />
                      <div>
                        <p className="text-sm font-medium text-[#1A1B22]">Voice Note</p>
                        <p className="text-xs text-zinc-400">Capture thoughts via voice</p>
                      </div>
                    </div>
                    <div className="ml-auto">
                      <AudioRecorder
                        onVoiceNote={(note) => {
                          setVoiceNoteId(note.id)
                          markChangedAndSaveNow({ voiceNoteId: note.id })
                        }}
                      />
                    </div>
                  </div>

                  {/* Today's Context */}
                  <div className="space-y-1">
                    <Label htmlFor="general-notes" className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400">
                      Today's Context
                    </Label>
                    <Textarea
                      id="general-notes"
                      value={generalNotes}
                      onChange={e => { setGeneralNotes(e.target.value); markChangedAndSchedule() }}
                      placeholder="Observations on mood, energy levels, context..."
                      rows={3}
                      className="resize-none text-sm bg-white"
                      data-testid="general-notes"
                    />
                  </div>

                  {/* Link to Lesson Plan */}
                  {studentLessons.length > 0 && (
                    <div className="space-y-1">
                      <Label htmlFor="linked-lesson" className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400">
                        Link to Lesson Plan (optional)
                      </Label>
                      <Select
                        value={selectedLessonId || '__none__'}
                        onValueChange={(v) => { const next = v === '__none__' ? '' : (v ?? selectedLessonId); setSelectedLessonId(next); markChangedAndSaveNow({ linkedLessonId: next || null }) }}
                      >
                        <SelectTrigger id="linked-lesson" className="text-sm bg-white" data-testid="linked-lesson">
                          <SelectValue placeholder="Search lessons..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {studentLessons.map(l => (
                            <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Level Reassessment */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        id="reassessment-toggle"
                        checked={reassessmentEnabled}
                        onChange={(v) => { setReassessmentEnabled(v); markChangedAndSaveNow({ levelReassessmentSkill: v ? 'General' : null, levelReassessmentLevel: v ? reassessmentLevel || null : null }) }}
                        label="Flag for Level Reassessment"
                        data-testid="reassessment-toggle"
                      />
                      <Label htmlFor="reassessment-toggle" className="text-sm cursor-pointer text-zinc-600">
                        Flag for Level Reassessment
                      </Label>
                    </div>
                    {reassessmentEnabled && (
                      <div className="space-y-1 ml-10">
                        <Label htmlFor="reassessment-level" className="text-xs text-zinc-500">New CEFR sub-level</Label>
                        <Select value={reassessmentLevel} onValueChange={(v) => { setReassessmentLevel(v ?? reassessmentLevel); markChangedAndSaveNow({ levelReassessmentLevel: v || null }) }}>
                          <SelectTrigger id="reassessment-level" className="text-sm bg-white w-40" data-testid="reassessment-level">
                            <SelectValue placeholder="e.g. B1.1" />
                          </SelectTrigger>
                          <SelectContent>
                            {CEFR_SUBLEVELS.map(l => (
                              <SelectItem key={l} value={l}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Cancelled session: minimal fields */}
          {isCancelled && (
            <div className="space-y-1">
              <p className="text-sm text-zinc-400 italic">This session was cancelled. Only date, duration, topics covered and notes will be recorded.</p>

              {/* Topics Covered */}
              <div className="space-y-1 pt-4">
                <Label className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400">Topics Covered</Label>
                <TopicTagsInput
                  value={topicTags}
                  onChange={(tags) => { setTopicTags(tags); markChangedAndSaveNow({ topicTags: tags.length > 0 ? serializeTopicTags(tags) : null }) }}
                />
              </div>

              {/* Today's Context */}
              <div className="space-y-1 pt-2">
                <Label htmlFor="general-notes" className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-zinc-400">
                  Notes
                </Label>
                <Textarea
                  id="general-notes"
                  value={generalNotes}
                  onChange={e => { setGeneralNotes(e.target.value); markChangedAndSchedule() }}
                  placeholder="Notes about the cancellation..."
                  rows={3}
                  className="resize-none text-sm bg-white"
                  data-testid="general-notes"
                />
              </div>

              {/* Level Reassessment */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <ToggleSwitch
                    id="reassessment-toggle"
                    checked={reassessmentEnabled}
                    onChange={(v) => { setReassessmentEnabled(v); markChangedAndSaveNow({ levelReassessmentSkill: v ? 'General' : null, levelReassessmentLevel: v ? reassessmentLevel || null : null }) }}
                    label="Flag for Level Reassessment"
                    data-testid="reassessment-toggle"
                  />
                  <Label htmlFor="reassessment-toggle" className="text-sm cursor-pointer text-zinc-600">
                    Flag for Level Reassessment
                  </Label>
                </div>
                {reassessmentEnabled && (
                  <div className="space-y-1 ml-10">
                    <Label htmlFor="reassessment-level" className="text-xs text-zinc-500">New CEFR sub-level</Label>
                    <Select value={reassessmentLevel} onValueChange={(v) => { setReassessmentLevel(v ?? reassessmentLevel); markChangedAndSaveNow({ levelReassessmentLevel: v || null }) }}>
                      <SelectTrigger id="reassessment-level" className="text-sm bg-white w-40" data-testid="reassessment-level">
                        <SelectValue placeholder="e.g. B1.1" />
                      </SelectTrigger>
                      <SelectContent>
                        {CEFR_SUBLEVELS.map(l => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Done error */}
          {doneError && (
            <div className="rounded-lg px-4 py-3 bg-red-50 text-sm text-red-700" data-testid="done-error">
              {doneError}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
