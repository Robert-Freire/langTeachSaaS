import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, X, ChevronDown,
  Loader2, CheckCircle, RefreshCw, Check,
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
import { formatDate as formatDateUtil, formatDateTime as formatDateTimeUtil, relativeTime, todayLocalDateStr } from '@/utils/formatDate'
import { getInitials } from '@/utils/nameUtils'
import { useSessionAutosave } from '@/hooks/useSessionAutosave'
import { logger } from '@/lib/logger'
import { HOMEWORK_STATUS_PILL_OPTIONS } from '@/utils/homeworkStatusUtils'
import { CEFR_LEVELS } from '@/lib/cefr-colors'

const PULSE_TIMEOUT_MS = 2800

type ExtractionSnapshot = {
  sessionTitle: string | undefined
  sessionDate: string
  sessionTime: string
  durationChoice: string
  durationOther: string
  actualContent: string
  homeworkAssigned: string
  nextSessionTopics: string
  generalNotes: string
  topicTags: TopicTag[]
}

const DURATION_OPTIONS = [
  { value: '25', label: '25 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '50', label: '50 min' },
  { value: '60', label: '60 min' },
  { value: '90', label: '90 min' },
  { value: 'other', label: 'Other (min)' },
]

const PREV_HOMEWORK_STATUSES = HOMEWORK_STATUS_PILL_OPTIONS

const todayISO = todayLocalDateStr

function nowTimeHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}


function formatDate(iso: string | null | undefined): string {
  if (!iso) return '--'
  return formatDateUtil(iso)
}

function formatDateMaybeTime(iso: string | null | undefined): string {
  if (!iso) return '--'
  const hasNonMidnightTime = iso.includes('T') && !/T00:00(:[0-9]{2})?(Z|[+-].*)?$/.test(iso)
  return hasNonMidnightTime ? formatDateTimeUtil(iso) : formatDateUtil(iso)
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
        checked ? 'bg-primary' : 'bg-zinc-300'
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
  const durationChoiceRef = useRef('50')
  const latestFieldsRef = useRef({ actualContent: '', generalNotes: '', homeworkAssigned: '', nextSessionTopics: '' })
  const sessionDateRef = useRef(sessionDate)
  const sessionTimeRef = useRef(sessionTime)
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

  // Voice extraction: pulse (one-shot, transient) + persistent marker until first edit / undo / next extraction
  const [pulsingFields, setPulsingFields] = useState<Set<string>>(new Set())
  const [extractedFields, setExtractedFields] = useState<Set<string>>(new Set())
  const [extractionSnapshot, setExtractionSnapshot] = useState<ExtractionSnapshot | null>(null)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
  // Tracks the session ID that the form state was last populated for. Lets the
  // populate effect run exactly once per unique session id, so a cache update for
  // the same session does not wipe the teacher's in-progress edits, but navigation
  // to a different session will re-initialize correctly.
  const initializedForIdRef = useRef<string | null>(null)
  // Tracks the last values received from the server for the 4 Atelier-patchable fields.
  // Used by the post-init sync effect to distinguish "user edited" from "server updated".
  const lastServerValuesRef = useRef<{
    title: string | undefined
    actualContent: string
    generalNotes: string
    homeworkAssigned: string
  } | null>(null)
  // Create mode: track whether we've pre-populated actualContent from plannedForToday
  const [didInitContent, setDidInitContent] = useState(false)

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
  const activeDifficulties = student?.profile.difficulties.filter(d => d.status === 'Active') ?? []
  const pendingTodos = student?.profile.teachingTodos.filter(t => t.status.toLowerCase() === 'pending') ?? []
  const showPrevHomework = (isEditMode && prevHomeworkStatus !== null) || (prevSession !== null && prevSession.homeworkAssigned !== null)
  const plannedForToday = prevSession?.nextSessionTopics ?? null

  // Edit mode: pre-populate form state from the fetched session
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!editSession) return
    if (initializedForIdRef.current === editSession.id) return
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
    setSessionTitle(editSession.title ?? undefined)
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
    lastServerValuesRef.current = {
      title: editSession.title ?? undefined,
      actualContent: editSession.actualContent ?? '',
      generalNotes: editSession.generalNotes ?? '',
      homeworkAssigned: editSession.homeworkAssigned ?? '',
    }
    initializedForIdRef.current = editSession.id
  }, [editSession])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Post-init sync: when the Atelier Assistant applies a proposal the server is PATCHed and
  // the ['session', id, sessionId] query is invalidated. On refetch editSession changes, but
  // the init effect above won't re-run (initializedForIdRef guard). This effect syncs the 4
  // patchable fields back to local state for any field the teacher hasn't manually edited.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!editSession) return
    if (initializedForIdRef.current !== editSession.id) return
    const prev = lastServerValuesRef.current
    if (!prev) return
    const nextTitle = editSession.title ?? undefined
    const nextActualContent = editSession.actualContent ?? ''
    const nextGeneralNotes = editSession.generalNotes ?? ''
    const nextHomeworkAssigned = editSession.homeworkAssigned ?? ''
    // Each field: only sync if local value matches last server value (user hasn't dirtied it)
    if (sessionTitle === prev.title && nextTitle !== prev.title) setSessionTitle(nextTitle)
    if (actualContent === prev.actualContent && nextActualContent !== prev.actualContent) setActualContent(nextActualContent)
    if (generalNotes === prev.generalNotes && nextGeneralNotes !== prev.generalNotes) setGeneralNotes(nextGeneralNotes)
    if (homeworkAssigned === prev.homeworkAssigned && nextHomeworkAssigned !== prev.homeworkAssigned) setHomeworkAssigned(nextHomeworkAssigned)
    lastServerValuesRef.current = { title: nextTitle, actualContent: nextActualContent, generalNotes: nextGeneralNotes, homeworkAssigned: nextHomeworkAssigned }
  }, [editSession]) // intentionally reads local state without declaring as deps
  /* eslint-enable react-hooks/set-state-in-effect */

  // Keep durationChoiceRef current so async extraction callbacks read the latest value, not a stale closure
  useEffect(() => { durationChoiceRef.current = durationChoice }, [durationChoice])
  // Keep latestFieldsRef current so append-mode extraction reads the current field values, not stale closure values
  useEffect(() => {
    latestFieldsRef.current = { actualContent, generalNotes, homeworkAssigned, nextSessionTopics }
  }, [actualContent, generalNotes, homeworkAssigned, nextSessionTopics])
  // Keep sessionDateRef and sessionTimeRef current so extraction callbacks read the value the teacher
  // may have edited while extraction was in flight, not the stale closure value from when extraction started
  useEffect(() => { sessionDateRef.current = sessionDate }, [sessionDate])
  useEffect(() => { sessionTimeRef.current = sessionTime }, [sessionTime])

  // In create mode, pre-populate actualContent from the previous session's planned topics once data loads
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isEditMode || didInitContent || sessionsLoading) return
    setDidInitContent(true)
    if (plannedForToday) setActualContent(prev => prev || plannedForToday)
  }, [isEditMode, didInitContent, sessionsLoading, plannedForToday])
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
  const { status: saveStatus, sessionId: autosavedSessionId, lastSavedAt, scheduleTextSave, saveNow } = useSessionAutosave(
    autosaveStudentId,
    getFormDataRef,
    isEditMode ? editSession?.id : undefined,
  )

  useEffect(() => () => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
  }, [])

  function trackManualEdit(fieldName: string) {
    if (!extractionSnapshot) return
    setExtractedFields(prev => {
      if (!prev.has(fieldName)) return prev
      const next = new Set(prev); next.delete(fieldName); return next
    })
    setPulsingFields(prev => {
      if (!prev.has(fieldName)) return prev
      const next = new Set(prev); next.delete(fieldName); return next
    })
  }

  function fieldMarkerClass(field: string, opts?: { wrapper?: boolean }): string {
    const parts: string[] = []
    if (pulsingFields.has(field)) parts.push('animate-extraction-pulse')
    if (extractedFields.has(field)) {
      parts.push(opts?.wrapper ? 'border-l-[3px] border-indigo-500 pl-2' : 'border-l-[3px] border-indigo-500')
    }
    return parts.join(' ')
  }

  function markChangedAndSchedule() {
    setHasChanges(true)
    scheduleTextSave()
  }

  function markChangedAndSaveNow(override?: Partial<CreateSessionLogRequest>) {
    setHasChanges(true)
    void saveNow(override)
  }

  const doneNavTarget = isEditMode ? `/students/${id}?tab=sessions` : `/students/${id}`

  async function handleBack() {
    if (isEditMode) {
      // Edit mode: autosave persists on every change and updates the RQ cache on
      // success, so there is nothing to "discard" - clicking back should silently
      // flush any pending debounced save and navigate away. If the flush fails we
      // must NOT navigate: that would leave the user thinking their last edits
      // were saved when they were not.
      if (hasChanges) {
        setDoneError(null)
        const sid = await saveNow()
        if (!sid) {
          setDoneError('Failed to save session. Please try again.')
          return
        }
      }
      navigate(doneNavTarget)
      return
    }
    // Create mode: the "Discard" banner still makes sense because autosave
    // progressively creates a draft and the user may want to throw it away.
    const isDirty = hasChanges || !!autosavedSessionId
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

  function handleUndoExtraction() {
    if (!extractionSnapshot) return
    const keep = extractedFields
    if (keep.has('sessionTitle')) setSessionTitle(extractionSnapshot.sessionTitle)
    if (keep.has('sessionDate')) setSessionDate(extractionSnapshot.sessionDate)
    if (keep.has('sessionTime')) setSessionTime(extractionSnapshot.sessionTime)
    if (keep.has('durationChoice')) {
      setDurationChoice(extractionSnapshot.durationChoice)
      setDurationOther(extractionSnapshot.durationOther)
    }
    if (keep.has('actualContent')) setActualContent(extractionSnapshot.actualContent)
    if (keep.has('homeworkAssigned')) setHomeworkAssigned(extractionSnapshot.homeworkAssigned)
    if (keep.has('nextSessionTopics')) setNextSessionTopics(extractionSnapshot.nextSessionTopics)
    if (keep.has('generalNotes')) setGeneralNotes(extractionSnapshot.generalNotes)
    if (keep.has('topicTags')) setTopicTags(extractionSnapshot.topicTags)
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
    setPulsingFields(new Set())
    setExtractedFields(new Set())
    setExtractionSnapshot(null)
    markChangedAndSchedule()
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

  const sortedObjectives = [...(student.profile.shortTermObjectives)].sort((a, b) => {
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
            className="flex items-center justify-center rounded-xl text-white text-sm font-bold shrink-0 lt-gradient-primary"
            style={{ width: 44, height: 44 }}
            aria-hidden
          >
            {getInitials(student.name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline text-base font-bold text-[#1A1B22] leading-tight" data-testid="student-name">
                {student.name}
              </h2>
              <CefrBadge level={student.level.cefrLevel} data-testid="cefr-badge" />
            </div>
            {student.languages.nativeLanguages.length > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">{student.languages.nativeLanguages.join(', ')}</p>
            )}
            {sessionsLoading ? (
              <Skeleton className="h-3 w-20 mt-1" />
            ) : (
              <p className="text-xs text-zinc-400 mt-0.5" data-testid="session-number">Session #{sessionNumber}</p>
            )}
            {Object.keys(student.level.skillLevelOverrides).length > 0 && (
              <p className="text-xs text-zinc-400 mt-1" data-testid="skill-levels-row">
                {Object.entries(student.level.skillLevelOverrides).map(([skill, level], i) => (
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
                <div
                  key={todo.id}
                  className="flex items-start gap-2.5"
                  data-testid="teaching-todo-item"
                >
                  <button
                    type="button"
                    onClick={() => toggleTodo(todo.id)}
                    aria-label={checkedTodoIds.has(todo.id) ? 'Mark uncovered' : 'Mark covered'}
                    aria-pressed={checkedTodoIds.has(todo.id)}
                    data-testid="teaching-todo-toggle"
                    className={`mt-0.5 shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                      checkedTodoIds.has(todo.id)
                        ? 'bg-green-500 border-green-500'
                        : 'border-indigo-400 hover:border-indigo-600'
                    }`}
                  >
                    {checkedTodoIds.has(todo.id) && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                  </button>
                  <span className={`text-sm leading-snug ${checkedTodoIds.has(todo.id) ? 'line-through text-zinc-400' : 'text-[#1A1B22]'}`}>
                    {todo.text}
                  </span>
                </div>
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
                <div
                  key={f.id}
                  className="flex items-start gap-2.5"
                  data-testid="followup-item"
                >
                  <button
                    type="button"
                    onClick={() => toggleFollowup(f.id)}
                    aria-label={checkedFollowupIds.has(f.id) ? 'Mark pending' : 'Mark done'}
                    aria-pressed={checkedFollowupIds.has(f.id)}
                    data-testid="followup-toggle"
                    className={`mt-0.5 shrink-0 w-3 h-3 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                      checkedFollowupIds.has(f.id)
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-amber-400 bg-amber-100 hover:bg-amber-500'
                    }`}
                  />
                  <span className={`text-sm leading-snug transition-all duration-150 ${checkedFollowupIds.has(f.id) ? 'line-through text-zinc-400 opacity-60' : 'text-[#1A1B22]'}`}>
                    {f.text}
                    {f.dueDate && (
                      <span className="ml-1.5 text-xs text-amber-600">{formatDate(f.dueDate)}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </PanelSection>
        )}

        {/* Last Session */}
        {prevSession ? (
          <PanelSection label={`Last Session (#${sessions.filter(s => !s.isCancelled).length})`}>
            <div className="rounded-lg bg-white px-3 py-2.5 space-y-1" style={{ boxShadow: '0 1px 4px rgba(26,27,34,0.06)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">{formatDateMaybeTime(prevSession.sessionDate)}</p>
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
        {student.profile.teachingNotes && (
          <PanelSection label="Working Memory">
            <div
              className="rounded-lg bg-white px-3 py-2.5"
              style={{ boxShadow: '0 1px 4px rgba(26,27,34,0.06)' }}
              data-testid="working-memory-card"
            >
              <p className={`text-sm text-zinc-600 leading-snug whitespace-pre-wrap ${!workingMemoryExpanded ? 'line-clamp-4' : ''}`}>
                {student.profile.teachingNotes}
              </p>
              {student.profile.teachingNotes.length > 200 && (
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

        {/* Active Difficulties — read-only reference, tinted to distinguish from interactive sections */}
        {activeDifficulties.length > 0 && (
          <PanelSection label="Student Difficulties">
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2.5 space-y-1.5">
              {activeDifficulties.map(d => {
                const key = `${d.competency}|${d.subcategory}`
                return (
                  <div key={d.id} className="flex items-start gap-2.5" data-testid="difficulty-item">
                    <button
                      type="button"
                      onClick={() => toggleDifficulty(key)}
                      aria-label={mentionedDifficultyKeys.has(key) ? 'Mark unmentioned' : 'Mark mentioned'}
                      aria-pressed={mentionedDifficultyKeys.has(key)}
                      data-testid="difficulty-toggle"
                      className={`mt-0.5 shrink-0 w-3 h-3 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                        mentionedDifficultyKeys.has(key)
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-amber-400 bg-amber-100 hover:bg-amber-500'
                      }`}
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
                  </div>
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
              {isEditMode && saveStatus === 'idle' && (lastSavedAt || editSession?.updatedAt) && (
                <span className="text-zinc-400">Last saved {relativeTime(lastSavedAt ?? editSession!.updatedAt)}</span>
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

          {/* Undo extraction bar — sticky so it follows scroll while teacher reviews */}
          {extractedFields.size > 0 && (
            <div
              role="status"
              aria-live="polite"
              className="sticky top-2 z-20 flex items-center gap-3 rounded-xl px-4 py-2.5 shadow-sm"
              style={{ background: '#EEF0FD' }}
              data-testid="undo-extraction-bar"
            >
              <span className="text-sm text-indigo-800 flex-1">
                {extractedFields.size} {extractedFields.size === 1 ? 'field' : 'fields'} filled from recording
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleUndoExtraction}
                className="text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 shrink-0 h-7 px-2"
                data-testid="undo-extraction-btn"
              >
                Undo extraction
              </Button>
              <button
                type="button"
                onClick={() => {
                  if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
                  setPulsingFields(new Set())
                  setExtractedFields(new Set())
                  setExtractionSnapshot(null)
                }}
                className="text-indigo-500 hover:text-indigo-700 shrink-0"
                aria-label="Dismiss"
                data-testid="dismiss-undo-bar"
              >
                <X className="h-4 w-4" />
              </button>
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
                const snapshot: ExtractionSnapshot = {
                  sessionTitle,
                  sessionDate: sessionDateRef.current,
                  sessionTime: sessionTimeRef.current,
                  durationChoice: durationChoiceRef.current,
                  durationOther,
                  actualContent: latestFieldsRef.current.actualContent,
                  homeworkAssigned: latestFieldsRef.current.homeworkAssigned,
                  nextSessionTopics: latestFieldsRef.current.nextSessionTopics,
                  generalNotes: latestFieldsRef.current.generalNotes,
                  topicTags: [...topicTags],
                }
                setExtractionSnapshot(snapshot)
                // Replace, not stack: a new recording on the same session starts fresh
                if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
                setPulsingFields(new Set())
                setExtractedFields(new Set())
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
                      saveOverride.title = extracted.sessionTitle
                      setSessionTitle(extracted.sessionTitle)
                    }
                    const applyMode = (existing: string, field: { value: string | null; mode: string } | null): string | null => {
                      if (!field || !field.value || field.mode === 'skip') return null
                      if (field.mode === 'replace') return field.value
                      return existing ? `${existing} ${field.value}` : field.value
                    }
                    const { actualContent: curActualContent, generalNotes: curGeneralNotes,
                            homeworkAssigned: curHomeworkAssigned, nextSessionTopics: curNextSessionTopics } = latestFieldsRef.current
                    const nextActualContent = applyMode(curActualContent, extracted.whatWasCovered)
                    if (nextActualContent !== null) {
                      saveOverride.actualContent = nextActualContent
                      setActualContent(nextActualContent)
                    }
                    let nextGeneralNotes: string | null = null
                    if (extracted.areasToImprove || extracted.emotionalSignals) {
                      // emotionalSignals has no mode; always include it. Only include areasToImprove value if mode != 'skip'.
                      const areasValue = extracted.areasToImprove?.mode !== 'skip' ? extracted.areasToImprove?.value : null
                      const combinedValue = [areasValue, extracted.emotionalSignals].filter(Boolean).join(' ')
                      const effectiveMode = areasValue ? (extracted.areasToImprove?.mode ?? 'replace') : 'replace'
                      const combinedField = combinedValue ? { value: combinedValue, mode: effectiveMode } : null
                      nextGeneralNotes = applyMode(curGeneralNotes, combinedField)
                      if (nextGeneralNotes !== null) {
                        saveOverride.generalNotes = nextGeneralNotes
                        setGeneralNotes(nextGeneralNotes)
                      }
                    }
                    const nextHomeworkAssigned = applyMode(curHomeworkAssigned, extracted.homeworkAssigned)
                    if (nextHomeworkAssigned !== null) {
                      saveOverride.homeworkAssigned = nextHomeworkAssigned
                      setHomeworkAssigned(nextHomeworkAssigned)
                    }
                    const nextSessionTopicsNext = applyMode(curNextSessionTopics, extracted.nextSessionTopics)
                    if (nextSessionTopicsNext !== null) {
                      saveOverride.nextSessionTopics = nextSessionTopicsNext
                      setNextSessionTopics(nextSessionTopicsNext)
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
                    const [datePart, embeddedTime] = extracted.sessionDate
                      ? (extracted.sessionDate.split('T') as [string, string | undefined])
                      : [null, null]
                    const nextDate = datePart || sessionDateRef.current
                    const nextTime = extracted.sessionStartTime || embeddedTime || sessionTimeRef.current
                    if (datePart) setSessionDate(datePart)
                    if (extracted.sessionStartTime) setSessionTime(extracted.sessionStartTime)
                    else if (embeddedTime) setSessionTime(embeddedTime)
                    if (extracted.sessionDate || extracted.sessionStartTime) {
                      saveOverride.sessionDate = `${nextDate}T${nextTime || '00:00'}:00`
                    }
                    if (extracted.durationMinutes) {
                      const dur = extracted.durationMinutes
                      const presets = ['25', '30', '45', '50', '60', '90']
                      if (durationChoiceRef.current === '50') {
                        const newChoice = presets.includes(String(dur)) ? String(dur) : 'other'
                        saveOverride.duration = dur
                        setDurationChoice(newChoice)
                        if (newChoice === 'other') setDurationOther(String(dur))
                      }
                    }

                    // Detect changed fields for highlight + undo bar
                    const changed = new Set<string>()
                    if (extracted.sessionTitle && extracted.sessionTitle !== snapshot.sessionTitle) changed.add('sessionTitle')
                    if (datePart && datePart !== snapshot.sessionDate) changed.add('sessionDate')
                    if (extracted.sessionStartTime && extracted.sessionStartTime !== snapshot.sessionTime) changed.add('sessionTime')
                    else if (!extracted.sessionStartTime && embeddedTime && embeddedTime !== snapshot.sessionTime) changed.add('sessionTime')
                    if (extracted.durationMinutes && durationChoiceRef.current === '50') {
                      const presets = ['25', '30', '45', '50', '60', '90']
                      const newDurChoice = presets.includes(String(extracted.durationMinutes)) ? String(extracted.durationMinutes) : 'other'
                      if (newDurChoice !== snapshot.durationChoice) changed.add('durationChoice')
                    }
                    if (nextActualContent !== null && nextActualContent !== snapshot.actualContent) changed.add('actualContent')
                    if (nextGeneralNotes !== null && nextGeneralNotes !== snapshot.generalNotes) changed.add('generalNotes')
                    if (nextHomeworkAssigned !== null && nextHomeworkAssigned !== snapshot.homeworkAssigned) changed.add('homeworkAssigned')
                    if (nextSessionTopicsNext !== null && nextSessionTopicsNext !== snapshot.nextSessionTopics) changed.add('nextSessionTopics')
                    if (
                      extracted.topicTags && extracted.topicTags.length > 0 &&
                      extracted.topicTags.some(t => !snapshot.topicTags.some(s => s.tag.toLowerCase() === t.tag.toLowerCase()))
                    ) changed.add('topicTags')

                    if (extracted.teachingTodos && extracted.teachingTodos.length > 0)
                      setNewTodos(prev => [...prev, ...extracted.teachingTodos!.filter(t => !prev.includes(t))])
                    if (extracted.teacherFollowups && extracted.teacherFollowups.length > 0)
                      setNewFollowups(prev => [...prev, ...extracted.teacherFollowups!.filter(f => !prev.includes(f))])

                    if (changed.size > 0) {
                      setPulsingFields(changed)
                      setExtractedFields(changed)
                      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
                      pulseTimerRef.current = setTimeout(() => setPulsingFields(new Set()), PULSE_TIMEOUT_MS)
                    } else {
                      setExtractionSnapshot(null)
                    }

                    markChangedAndSaveNow(saveOverride)
                  })
                  .catch((err: unknown) => {
                    logger.error('LogSession', 'Voice note extraction failed', err)
                    setExtractionError('Could not analyse the recording. Fields were not filled in automatically.')
                    setExtractionSnapshot(null)
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
                onChange={e => { setSessionDate(e.target.value); trackManualEdit('sessionDate'); markChangedAndSchedule() }}
                className={`text-sm bg-zinc-100 border-none h-8 px-2.5 focus-visible:border-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 ${fieldMarkerClass('sessionDate')}`}
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
                onChange={e => { setSessionTime(e.target.value); trackManualEdit('sessionTime'); markChangedAndSchedule() }}
                className={`text-sm bg-zinc-100 border-none h-8 px-2.5 focus-visible:border-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 ${fieldMarkerClass('sessionTime')}`}
                data-testid="session-time"
              />
            </div>

            {/* Duration */}
            <div className="space-y-1">
              <Label htmlFor="duration" className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Duration</Label>
              <div className="flex items-center gap-2">
                <Select value={durationChoice} onValueChange={(v) => { const val = v ?? durationChoice; setDurationChoice(val); trackManualEdit('durationChoice'); markChangedAndSaveNow({ duration: val === 'other' ? null : parseInt(val, 10) }) }}>
                  <SelectTrigger id="duration" className={`text-sm bg-zinc-100 border-none h-8 px-2.5 focus-visible:border-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 flex-1 ${fieldMarkerClass('durationChoice')}`} data-testid="duration-select">
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

            {/* Cancelled — spacer matches the label height of Date/Time/Duration cells */}
            <div className="space-y-1">
              <span className="block text-xs invisible" aria-hidden="true">&nbsp;</span>
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

          {/* Session Title */}
          <div className="space-y-1">
            <Label htmlFor="session-title" className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">
              Title <span className="normal-case tracking-normal font-normal">(optional)</span>
            </Label>
            <Input
              id="session-title"
              value={sessionTitle ?? ''}
              onChange={e => { setSessionTitle(e.target.value || undefined); trackManualEdit('sessionTitle'); markChangedAndSchedule() }}
              placeholder="What did you work on? (optional)"
              maxLength={120}
              className={`text-sm bg-white ${fieldMarkerClass('sessionTitle')}`}
              data-testid="log-session-title-input"
            />
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
                    Session #{sessionNumber}&ensp;&middot;&ensp;{formatDateMaybeTime(isEditMode ? editSession?.sessionDate : sessionDate)}
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
                            ? 'bg-primary text-white'
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
                  onChange={e => { setActualContent(e.target.value); trackManualEdit('actualContent'); markChangedAndSchedule() }}
                  placeholder="Describe what happened in the session..."
                  rows={6}
                  className={`resize-none text-sm bg-white ${fieldMarkerClass('actualContent')}`}
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
                <div className={`rounded-md ${fieldMarkerClass('topicTags', { wrapper: true })}`} data-testid="topic-tags-highlight-wrapper">
                  <TopicTagsInput
                    value={topicTags}
                    onChange={(tags) => { setTopicTags(tags); trackManualEdit('topicTags'); markChangedAndSaveNow({ topicTags: tags.length > 0 ? serializeTopicTags(tags) : null }) }}
                  />
                </div>
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
                        onClick={() => {
                          setSuggestedDifficulties(prev => prev.filter((_, j) => j !== i))
                          markChangedAndSchedule()
                        }}
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
                      onValueChange={v => setNewDifficulty(prev => ({ ...prev, competency: v ?? '' }))}
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
                      disabled={!newDifficulty.description.trim() || !newDifficulty.competency}
                      onClick={() => {
                        const desc = newDifficulty.description.trim()
                        if (!desc || !newDifficulty.competency) return
                        const next = [...suggestedDifficulties, {
                          competency: newDifficulty.competency,
                          subcategory: newDifficulty.subcategory,
                          description: desc,
                          severity: 'Medium',
                        }]
                        setSuggestedDifficulties(next)
                        setNewDifficulty({ description: '', competency: '', subcategory: '' })
                        markChangedAndSaveNow({ suggestedDifficulties: next })
                      }}
                      className="shrink-0"
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
                  onChange={e => { setHomeworkAssigned(e.target.value); trackManualEdit('homeworkAssigned'); markChangedAndSchedule() }}
                  placeholder="e.g. Workbook page 42, exercises 3-5"
                  className={`text-sm bg-white ${fieldMarkerClass('homeworkAssigned')}`}
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
                  onChange={e => { setNextSessionTopics(e.target.value); trackManualEdit('nextSessionTopics'); markChangedAndSchedule() }}
                  placeholder="What to focus on next time..."
                  rows={3}
                  className={`resize-none text-sm bg-white ${fieldMarkerClass('nextSessionTopics')}`}
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
                    <Button type="button" size="sm" onClick={addTodo}>
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
                      onChange={e => { setGeneralNotes(e.target.value); trackManualEdit('generalNotes'); markChangedAndSchedule() }}
                      placeholder="Observations on mood, energy levels, context..."
                      rows={3}
                      className={`resize-none text-sm bg-white ${fieldMarkerClass('generalNotes')}`}
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
                        <Label htmlFor="reassessment-level" className="text-xs text-zinc-500">New CEFR level</Label>
                        <Select value={reassessmentLevel} onValueChange={(v) => { setReassessmentLevel(v ?? reassessmentLevel); markChangedAndSaveNow({ levelReassessmentLevel: v || null }) }}>
                          <SelectTrigger id="reassessment-level" className="text-sm bg-white w-40" data-testid="reassessment-level">
                            <SelectValue placeholder="e.g. B1" />
                          </SelectTrigger>
                          <SelectContent>
                            {CEFR_LEVELS.map(l => (
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
              <div className="bg-amber-50 rounded p-3 text-sm text-amber-800">This session was cancelled. Only date, duration, topics covered and notes will be recorded.</div>

              {/* Topics Covered */}
              <div className="space-y-1 pt-4">
                <Label className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">Topics Covered</Label>
                <div className={`rounded-md ${fieldMarkerClass('topicTags', { wrapper: true })}`}>
                  <TopicTagsInput
                    value={topicTags}
                    onChange={(tags) => { setTopicTags(tags); trackManualEdit('topicTags'); markChangedAndSaveNow({ topicTags: tags.length > 0 ? serializeTopicTags(tags) : null }) }}
                  />
                </div>
              </div>

              {/* Today's Context */}
              <div className="space-y-1 pt-2">
                <Label htmlFor="general-notes" className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">
                  Notes
                </Label>
                <Textarea
                  id="general-notes"
                  value={generalNotes}
                  onChange={e => { setGeneralNotes(e.target.value); trackManualEdit('generalNotes'); markChangedAndSchedule() }}
                  placeholder="Notes about the cancellation..."
                  rows={3}
                  className={`resize-none text-sm bg-white ${fieldMarkerClass('generalNotes')}`}
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
                    <Label htmlFor="reassessment-level" className="text-xs text-zinc-500">New CEFR level</Label>
                    <Select value={reassessmentLevel} onValueChange={(v) => { setReassessmentLevel(v ?? reassessmentLevel); markChangedAndSaveNow({ levelReassessmentLevel: v || null }) }}>
                      <SelectTrigger id="reassessment-level" className="text-sm bg-white w-40" data-testid="reassessment-level">
                        <SelectValue placeholder="e.g. B1" />
                      </SelectTrigger>
                      <SelectContent>
                        {CEFR_LEVELS.map(l => (
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
