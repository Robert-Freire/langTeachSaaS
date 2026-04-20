import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, X, ChevronDown,
  Loader2, CheckCircle, RefreshCw,
} from 'lucide-react'
import { getStudent, appendTeachingTodo, updateTeachingTodo } from '@/api/students'
import {
  getSession, listSessions, parseTopicTags, serializeTopicTags,
  extractSessionReflection,
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
import { COMPETENCY_OPTIONS } from '@/lib/studentOptions'
import { getObjectiveUrgency, getDaysRemaining } from '@/lib/objectiveUrgency'
import { suggestTopicTags } from '@/lib/suggestTopicTags'
import { formatDate as formatDateUtil, relativeTime } from '@/utils/formatDate'
import { useSessionAutosave } from '@/hooks/useSessionAutosave'
import { logger } from '@/lib/logger'

const DURATION_OPTIONS = [
  { value: '25', label: '25 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '50', label: '50 min' },
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

function nowTimeHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
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
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">{label}</p>
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
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        checked ? 'bg-indigo-600' : 'bg-zinc-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
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
  const [sessionTime, setSessionTime] = useState(nowTimeHHMM())
  const [durationChoice, setDurationChoice] = useState('50')
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
  const [voiceNoteTranscription, setVoiceNoteTranscription] = useState<string | undefined>()
  const [rawExtractionJson, setRawExtractionJson] = useState<string | undefined>()
  const [sessionTitle, setSessionTitle] = useState<string | undefined>()
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [secondaryOpen, setSecondaryOpen] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [suggestedDifficulties, setSuggestedDifficulties] = useState<SuggestedDifficulty[]>([])
  const [newDifficulty, setNewDifficulty] = useState({ description: '', competency: '', subcategory: '' })

  // Left panel interactive state
  const [checkedTodoIds, setCheckedTodoIds] = useState<Set<string>>(new Set())
  const [checkedFollowupIds, setCheckedFollowupIds] = useState<Set<string>>(new Set())
  const [mentionedDifficultyKeys, setMentionedDifficultyKeys] = useState<Set<string>>(new Set())
  const [workingMemoryExpanded, setWorkingMemoryExpanded] = useState(false)
  const [expandedDifficulties, setExpandedDifficulties] = useState<Set<string>>(new Set())

  // Quick-add lists (applied on Done)
  const [newTodoText, setNewTodoText] = useState('')
  const [newTodos, setNewTodos] = useState<string[]>([])
  const [newFollowupText, setNewFollowupText] = useState('')
  const [newFollowups, setNewFollowups] = useState<string[]>([])

  // Scroll gradient
  const [showScrollGradient, setShowScrollGradient] = useState(false)
  const scrollSentinelRef = useRef<HTMLDivElement>(null)
  const asideRef = useRef<HTMLDivElement>(null)

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
  const pendingTodos = student?.teachingTodos.filter(t => t.status.toLowerCase() === 'pending') ?? []
  const showPrevHomework = (isEditMode && prevHomeworkStatus !== null) || (prevSession !== null && prevSession.homeworkAssigned !== null)
  const plannedForToday = prevSession?.nextSessionTopics ?? null

  // Edit mode: pre-populate form state from the fetched session
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!editSession || didInitEdit) return
    const [datePart, timePart] = (editSession.sessionDate ?? '').split('T')
    setSessionDate(datePart || todayISO())
    setSessionTime(timePart?.slice(0, 5) || nowTimeHHMM())
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
    if (dur === null || dur === undefined) {
      setDurationChoice('other')
      setDurationOther('')
    } else if ([25, 30, 45, 50, 60, 90].includes(dur)) {
      setDurationChoice(String(dur))
      setDurationOther('')
    } else {
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
      sessionDate: sessionDate ? `${sessionDate}T${sessionTime || '00:00'}:00` : null,
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
      title: sessionTitle || null,
      ...(voiceNoteId ? { voiceNoteId } : {}),
      ...(voiceNoteTranscription ? { voiceNoteTranscription } : {}),
      ...(rawExtractionJson ? { rawExtractionJson } : {}),
    })
  }, [
    sessionDate, sessionTime, durationChoice, durationOther, isCancelled, prevHomeworkStatus,
    actualContent, homeworkAssigned, nextSessionTopics, generalNotes, topicTags,
    reassessmentEnabled, reassessmentLevel, selectedLessonId, voiceNoteId,
    mentionedDifficultyKeys, activeDifficulties, plannedForToday, suggestedDifficulties,
    sessionTitle, voiceNoteTranscription, rawExtractionJson,
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
    // In edit mode, autosavedSessionId is seeded from the existing session,
    // so only hasChanges determines whether the user made edits.
    // In create mode, an autosavedSessionId means a session was created by autosave.
    const isDirty = hasChanges || (!isEditMode && !!autosavedSessionId)
    if (!isDirty) {
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

  // Scroll gradient: observe sentinel at bottom of left panel
  // Depends on loading state so the observer attaches after early-return skeleton is replaced by the real DOM
  useEffect(() => {
    const sentinel = scrollSentinelRef.current
    const aside = asideRef.current
    if (!sentinel || !aside) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollGradient(!entry.isIntersecting),
      { root: aside, threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [studentLoading, editSessionLoading])

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
      <div className="p-8 flex flex-col gap-3" data-testid="log-session-not-found">
        <p className="text-sm text-zinc-500">Student not found.</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="self-start text-sm text-indigo-600 hover:underline"
        >
          Go back
        </button>
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
        ref={asideRef}
        className="relative w-[35%] shrink-0 overflow-y-auto px-6 py-8 space-y-6"
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
            {Object.keys(student.skillLevelOverrides).length > 0 && (
              <p className="text-xs text-zinc-400 mt-1" data-testid="skill-levels-row">
                {Object.entries(student.skillLevelOverrides).map(([skill, level], i) => (
                  <span key={skill}>
                    {i > 0 && <span className="mx-1 text-zinc-300">|</span>}
                    {skill} {level}
                  </span>
                ))}
              </p>
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
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-indigo-600 shrink-0"
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
          <PanelSection label="Open followups from previous sessions">
            <p className="text-xs text-zinc-400 -mt-1">Check items you addressed in this session</p>
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
                    className="mt-0.5 h-4 w-4 rounded border-amber-300 accent-amber-500 shrink-0"
                    data-testid="followup-checkbox"
                  />
                  <span className={`text-sm leading-snug transition-all duration-150 ${checkedFollowupIds.has(f.id) ? 'line-through text-zinc-400 opacity-60' : 'text-[#1A1B22]'}`}>
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
        {prevSession ? (
          <PanelSection label={`Last Session (#${sessions.filter(s => !s.isCancelled).length})`}>
            <div className="rounded-lg bg-white px-3 py-2.5 space-y-1" style={{ boxShadow: '0 1px 4px rgba(26,27,34,0.06)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">{formatDate(prevSession.sessionDate)}</p>
                {prevSession.duration && (
                  <p className="text-xs text-zinc-400">{prevSession.duration} min</p>
                )}
              </div>
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
        ) : !isEditMode && !sessionsLoading ? (
          <PanelSection label="Last Session">
            <div
              className="rounded-lg bg-white px-3 py-2.5 text-center"
              style={{ boxShadow: '0 1px 4px rgba(26,27,34,0.06)' }}
              data-testid="first-session-empty"
            >
              <p className="text-sm font-medium text-indigo-600">First session!</p>
              <p className="text-xs text-zinc-400 mt-0.5">Great start with this student.</p>
            </div>
          </PanelSection>
        ) : null}

        {/* Working Memory (teacher notes) */}
        {student.teachingNotes && (
          <PanelSection label="Working Memory">
            <div
              className="rounded-lg bg-white px-3 py-2.5"
              style={{ boxShadow: '0 1px 4px rgba(26,27,34,0.06)' }}
              data-testid="working-memory-card"
            >
              <p className={`text-sm text-zinc-600 leading-snug whitespace-pre-wrap ${!workingMemoryExpanded ? 'line-clamp-4' : ''}`}>
                {student.teachingNotes}
              </p>
              {student.teachingNotes.length > 200 && (
                <button
                  type="button"
                  onClick={() => setWorkingMemoryExpanded(v => !v)}
                  className="text-xs text-indigo-500 hover:text-indigo-700 mt-1"
                  data-testid="working-memory-toggle"
                >
                  {workingMemoryExpanded ? 'Show less' : 'Show more'}
                </button>
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
          <PanelSection label="Student Difficulties">
            <div className="space-y-1.5">
              {activeDifficulties.map(d => {
                const key = `${d.competency}|${d.subcategory}`
                return (
                  <label key={d.id} className="flex items-start gap-2.5 cursor-pointer" data-testid="difficulty-item">
                    <input
                      type="checkbox"
                      checked={mentionedDifficultyKeys.has(key)}
                      onChange={() => toggleDifficulty(key)}
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-indigo-600 shrink-0"
                    />
                    <span className="text-sm text-[#1A1B22] leading-snug">
                      <span className={d.description.length > 80 && !expandedDifficulties.has(key) ? 'line-clamp-2' : ''}>
                        {d.description}
                      </span>
                      {d.description.length > 80 && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setExpandedDifficulties(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next }) }}
                          className="text-xs text-indigo-500 hover:text-indigo-700 ml-1"
                          data-testid="difficulty-expand-toggle"
                        >
                          {expandedDifficulties.has(key) ? 'less' : 'more'}
                        </button>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
            {mentionedDifficultyKeys.size > 0 && (
              <p className="text-[0.6875rem] text-indigo-500 mt-1">Checked items will be recorded as worked on today</p>
            )}
          </PanelSection>
        )}

        {/* Scroll sentinel */}
        <div ref={scrollSentinelRef} className="h-px shrink-0" aria-hidden />

        {/* Scroll gradient overlay */}
        {showScrollGradient && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-8"
            style={{ background: 'linear-gradient(to top, #F4F2FD, transparent)' }}
            data-testid="scroll-gradient"
            aria-hidden
          />
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
                  variant="ghost"
                  onClick={handleDiscard}
                  className="text-red-600 hover:bg-red-50"
                  data-testid="discard-btn"
                >
                  Discard
                </Button>
              </div>
            </div>
          )}

          {/* Voice recorder: primary alternative to filling the entire form manually */}
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: '#EEF0FD' }}
            data-testid="voice-recorder-section"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-indigo-800">Record your session</p>
              <p className="text-xs text-indigo-600/70">Speak freely. The recording will be transcribed and used to fill in all the fields below.</p>
            </div>
            <AudioRecorder
              onVoiceNote={(note) => {
                setVoiceNoteId(note.id)
                setExtractionError(null)
                const transcription = note.transcription
                if (!transcription || !id) {
                  markChangedAndSaveNow({ voiceNoteId: note.id })
                  return
                }
                setVoiceNoteTranscription(transcription)
                setIsExtracting(true)
                extractSessionReflection(id, transcription)
                  .then(extracted => {
                    // Build the save override from extracted values before touching state.
                    // getFormDataRef reads stale state until the next render, so we must
                    // pass extracted fields directly in the override to avoid a stale save.
                    // Blank-only: current state values here are pre-extraction (state hasn't flushed).
                    const saveOverride: Partial<CreateSessionLogRequest> = {
                      voiceNoteId: note.id,
                      voiceNoteTranscription: transcription,
                    }
                    const json = extracted.rawExtractionJson ?? null
                    if (json) {
                      saveOverride.rawExtractionJson = json
                      setRawExtractionJson(json)
                    }
                    if (extracted.sessionTitle) {
                      const next = sessionTitle || extracted.sessionTitle
                      saveOverride.title = next
                      setSessionTitle(next)
                    }
                    if (extracted.whatWasCovered) {
                      const next = actualContent || extracted.whatWasCovered
                      saveOverride.actualContent = next
                      setActualContent(next)
                    }
                    if (extracted.areasToImprove || extracted.emotionalSignals) {
                      const combined = [extracted.areasToImprove, extracted.emotionalSignals].filter(Boolean).join(' ')
                      const next = generalNotes || combined
                      saveOverride.generalNotes = next
                      setGeneralNotes(next)
                    }
                    if (extracted.homeworkAssigned) {
                      const next = homeworkAssigned || extracted.homeworkAssigned
                      saveOverride.homeworkAssigned = next
                      setHomeworkAssigned(next)
                    }
                    if (extracted.nextLessonIdeas) {
                      const next = nextSessionTopics || extracted.nextLessonIdeas
                      saveOverride.nextSessionTopics = next
                      setNextSessionTopics(next)
                    }
                    if (extracted.topicTags && extracted.topicTags.length > 0) {
                      const existing = new Set(topicTags.map(t => t.tag.toLowerCase()))
                      const merged = [...topicTags, ...extracted.topicTags.filter(t => !existing.has(t.tag.toLowerCase()))]
                      saveOverride.topicTags = serializeTopicTags(merged)
                      setTopicTags(merged)
                    }
                    if (extracted.suggestedDifficulties && extracted.suggestedDifficulties.length > 0 && suggestedDifficulties.length === 0) {
                      saveOverride.suggestedDifficulties = extracted.suggestedDifficulties
                      setSuggestedDifficulties(extracted.suggestedDifficulties)
                    }
                    if (extracted.durationMinutes) {
                      const dur = extracted.durationMinutes
                      const presets = ['25', '30', '45', '50', '60', '90']
                      if (durationChoice === '50') {
                        const newChoice = presets.includes(String(dur)) ? String(dur) : 'other'
                        saveOverride.duration = dur
                        setDurationChoice(newChoice)
                        if (newChoice === 'other') setDurationOther(String(dur))
                      }
                    }
                    markChangedAndSaveNow(saveOverride)
                  })
                  .catch((err: unknown) => {
                    logger.error('LogSession', 'Voice note extraction failed', err)
                    setExtractionError('Could not analyse the recording. Fields were not filled in automatically.')
                    markChangedAndSaveNow({ voiceNoteId: note.id, voiceNoteTranscription: transcription })
                  })
                  .finally(() => setIsExtracting(false))
              }}
            />
          </div>

          {/* Extraction status */}
          {isExtracting && (
            <div className="flex items-center gap-2 px-1 text-xs text-indigo-600" data-testid="extracting-indicator">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Analysing session...</span>
            </div>
          )}
          {extractionError && !isExtracting && (
            <p className="px-1 text-xs text-red-500" data-testid="extraction-error">{extractionError}</p>
          )}

          {/* ── Compact metadata bar: 2x2 grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl px-4 py-3" style={{ background: '#F4F2FD' }}>
            {/* Date */}
            <div className="space-y-1">
              <Label htmlFor="session-date" className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Date</Label>
              <Input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={e => { setSessionDate(e.target.value); markChangedAndSchedule() }}
                className="text-sm bg-zinc-100 border-none h-8 px-2.5 focus-visible:border-none focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                data-testid="session-date"
              />
            </div>

            {/* Time */}
            <div className="space-y-1">
              <Label htmlFor="session-time" className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Time</Label>
              <Input
                id="session-time"
                type="time"
                value={sessionTime}
                onChange={e => { setSessionTime(e.target.value); markChangedAndSchedule() }}
                className="text-sm bg-zinc-100 border-none h-8 px-2.5 focus-visible:border-none focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                data-testid="session-time"
              />
            </div>

            {/* Duration */}
            <div className="space-y-1">
              <Label htmlFor="duration" className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Duration</Label>
              <div className="flex items-center gap-2">
                <Select value={durationChoice} onValueChange={(v) => { const val = v ?? durationChoice; setDurationChoice(val); markChangedAndSaveNow({ duration: val === 'other' ? null : parseInt(val, 10) }) }}>
                  <SelectTrigger id="duration" className="text-sm bg-zinc-100 border-none h-8 px-2.5 focus-visible:border-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 flex-1" data-testid="duration-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {durationChoice === 'other' && (
                  <Input
                    id="duration-other"
                    type="number"
                    min="1"
                    value={durationOther}
                    onChange={e => { setDurationOther(e.target.value); markChangedAndSchedule() }}
                    placeholder="min"
                    className="text-sm bg-zinc-100 border-none h-8 px-2.5 w-20 focus:ring-2 focus:ring-indigo-500/20"
                    data-testid="duration-other"
                  />
                )}
              </div>
            </div>

            {/* Cancelled */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 h-8">
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
                  <p className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">
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
                <Label className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">Topics Covered</Label>
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
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1.5 min-h-[36px] text-sm font-medium text-indigo-700 hover:bg-indigo-200 transition-colors"
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

              {/* Difficulties Observed — always visible; populated by AI voice extraction or manual add */}
              <div className="space-y-1" data-testid="difficulties-observed-section">
                <Label className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">Difficulties Observed</Label>
                <p className="text-[0.6875rem] text-zinc-400 -mt-1">Add any difficulties you observed — detected from voice notes or added manually</p>
                <div className="space-y-1">
                  {suggestedDifficulties.map((d, i) => (
                    <div
                      key={`${d.competency}|${d.subcategory}|${i}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                      data-testid="suggested-difficulty-chip"
                    >
                      <div className="min-w-0">
                        {d.competency || d.subcategory
                          ? <span className="font-medium text-[#1A1B22]">{d.competency} / {d.subcategory}</span>
                          : <span className="font-medium text-[#1A1B22]">{d.description}</span>
                        }
                        {(d.competency || d.subcategory) && d.description && (
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
                <div className="space-y-1.5 pt-0.5" data-testid="new-difficulty-form">
                  <Input
                    value={newDifficulty.description}
                    onChange={e => setNewDifficulty(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g. Confuses ser/estar in past tense"
                    className="text-sm bg-white"
                    data-testid="new-difficulty-input"
                  />
                  <div className="flex gap-1.5">
                    <Select
                      value={newDifficulty.competency || undefined}
                      onValueChange={v => setNewDifficulty(prev => ({ ...prev, competency: v }))}
                    >
                      <SelectTrigger className="text-sm bg-white w-[140px] shrink-0" data-testid="new-difficulty-competency">
                        <SelectValue placeholder="Competency" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPETENCY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={newDifficulty.subcategory}
                      onChange={e => setNewDifficulty(prev => ({ ...prev, subcategory: e.target.value }))}
                      placeholder="Subcategory (e.g. ser/estar)"
                      className="text-sm bg-white flex-1"
                      data-testid="new-difficulty-subcategory"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const desc = newDifficulty.description.trim()
                        if (!desc) return
                        setSuggestedDifficulties(prev => [...prev, {
                          competency: newDifficulty.competency,
                          subcategory: newDifficulty.subcategory,
                          description: desc,
                          severity: 'Medium',
                        }])
                        setNewDifficulty({ description: '', competency: '', subcategory: '' })
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                      data-testid="add-difficulty-btn"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Homework Assigned */}
              <div className="space-y-1">
                <Label htmlFor="homework-assigned" className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">
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
                <Label htmlFor="next-session-topics" className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">
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
                  <p className="text-xs font-medium uppercase tracking-wider text-indigo-600">New Teaching Todos</p>
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
                      placeholder="Add a teaching idea..."
                      className="text-sm bg-white flex-1"
                      data-testid="new-todo-input"
                    />
                    <Button type="button" size="sm" onClick={addTodo} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Followups quick-add */}
                <div className="space-y-2 rounded-xl p-4" style={{ background: '#FFFBEB' }}>
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-600">New Followups</p>
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
                    <Button type="button" size="sm" onClick={addFollowup} className="bg-amber-500 hover:bg-amber-600 text-white">
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
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${secondaryOpen ? 'rotate-180' : ''}`} />
                {secondaryOpen ? 'Hide additional sections' : 'Show notes, lesson link, level reassessment...'}
              </button>

              {secondaryOpen && (
                <div className="space-y-6">
                  {/* Today's Context */}
                  <div className="space-y-1">
                    <Label htmlFor="general-notes" className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">
                      Notes
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
                      <Label htmlFor="linked-lesson" className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">
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
                <Label className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">Topics Covered</Label>
                <TopicTagsInput
                  value={topicTags}
                  onChange={(tags) => { setTopicTags(tags); markChangedAndSaveNow({ topicTags: tags.length > 0 ? serializeTopicTags(tags) : null }) }}
                />
              </div>

              {/* Today's Context */}
              <div className="space-y-1 pt-2">
                <Label htmlFor="general-notes" className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">
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
