import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, X, ChevronDown,
  Loader2, CheckCircle, RefreshCw, Users,
} from 'lucide-react'
import {
  serializeTopicTags, parseTopicTags, isSuggestedDifficulty,
  type TopicTag, type CreateSessionLogRequest, type SuggestedDifficulty,
} from '@/api/sessionLogs'
import {
  getGroup, getGroupSession, listGroupSessions, appendGroupTeachingIdea, extractGroupSessionReflection,
} from '@/api/groups'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { TopicTagsInput } from '@/components/session/TopicTagsInput'
import { AudioRecorder } from '@/components/audio/AudioRecorder'
import { GroupAvatarCluster } from '@/components/GroupAvatarCluster'
import { getAvatarColor } from '@/lib/avatarColor'
import { cn } from '@/lib/utils'
import { COMPETENCY_OPTIONS } from '@/lib/studentOptions'
import { suggestTopicTags } from '@/lib/suggestTopicTags'
import { formatDate as formatDateUtil, relativeTime, todayLocalDateStr } from '@/utils/formatDate'
import { getInitials } from '@/utils/nameUtils'
import { useGroupSessionAutosave } from '@/hooks/useGroupSessionAutosave'
import { logger } from '@/lib/logger'

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

const todayISO = todayLocalDateStr

function nowTimeHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '--'
  return formatDateUtil(iso)
}

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">{label}</p>
      {children}
    </div>
  )
}

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

export default function GroupLogSession() {
  const navigate = useNavigate()
  const { id: groupId, sessionId } = useParams<{ id: string; sessionId?: string }>()
  const isEditMode = !!sessionId
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
  const [actualContent, setActualContent] = useState('')
  const [homeworkAssigned, setHomeworkAssigned] = useState('')
  const [nextSessionTopics, setNextSessionTopics] = useState('')
  const [generalNotes, setGeneralNotes] = useState('')
  const [topicTags, setTopicTags] = useState<TopicTag[]>([])
  const [voiceNoteId, setVoiceNoteId] = useState<string | undefined>()
  const [voiceNoteTranscription, setVoiceNoteTranscription] = useState<string | undefined>()
  const [rawExtractionJson, setRawExtractionJson] = useState<string | undefined>()
  const [sessionTitle, setSessionTitle] = useState<string | undefined>()
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)

  const [pulsingFields, setPulsingFields] = useState<Set<string>>(new Set())
  const [extractedFields, setExtractedFields] = useState<Set<string>>(new Set())
  const [extractionSnapshot, setExtractionSnapshot] = useState<ExtractionSnapshot | null>(null)
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [secondaryOpen, setSecondaryOpen] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [suggestedDifficulties, setSuggestedDifficulties] = useState<SuggestedDifficulty[]>([])
  const [newDifficulty, setNewDifficulty] = useState({ description: '', competency: '', subcategory: '' })

  // Group member disclosure
  const [membersExpanded, setMembersExpanded] = useState(false)

  // Teaching Ideas / Followups (group-scoped; persisted to group profile via appendGroupTeachingIdea on Done)
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

  // Data fetching
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId!),
    enabled: !!groupId,
  })

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['group-sessions', groupId],
    queryFn: () => listGroupSessions(groupId!),
    enabled: !!groupId,
  })

  // Edit mode: load the existing group session. Query key matches the cancel key the
  // autosave hook uses, so an in-flight refetch can't clobber an optimistic write.
  const { data: editSession, isLoading: editSessionLoading, isError: editSessionError } = useQuery({
    queryKey: ['group-session', groupId, sessionId],
    queryFn: () => getGroupSession(groupId!, sessionId!),
    enabled: isEditMode && !!groupId && !!sessionId,
  })

  const nonCancelledSessions = sessions.filter(s => !s.isCancelled)
  // In edit mode "previous session" is the one before the edited session chronologically
  // (sessions arrive newest-first). Mirrors LogSession.tsx.
  const prevSession = isEditMode
    ? (() => {
        const idx = nonCancelledSessions.findIndex(s => s.id === sessionId)
        return idx >= 0 && idx + 1 < nonCancelledSessions.length ? nonCancelledSessions[idx + 1] : null
      })()
    : nonCancelledSessions[0] ?? null
  const editSessionRank = isEditMode
    ? (() => { const i = nonCancelledSessions.findIndex(s => s.id === sessionId); return i >= 0 ? nonCancelledSessions.length - i : null })()
    : null
  const sessionNumber: number | string = isEditMode ? (editSessionRank ?? '?') : nonCancelledSessions.length + 1

  // Guards the one-shot prefill effect so a refetch doesn't re-clobber teacher edits.
  const initializedForIdRef = useRef<string | null>(null)

  // Edit mode: pre-populate form state from the fetched session (one-shot per session id)
  useEffect(() => {
    if (!editSession) return
    if (initializedForIdRef.current === editSession.id) return
    const [datePart, timePart] = (editSession.sessionDate ?? '').split('T')
    setSessionDate(datePart || todayISO())
    setSessionTime(timePart?.slice(0, 5) || nowTimeHHMM())
    setActualContent(editSession.actualContent ?? '')
    setHomeworkAssigned(editSession.homeworkAssigned ?? '')
    setNextSessionTopics(editSession.nextSessionTopics ?? '')
    setGeneralNotes(editSession.generalNotes ?? '')
    setIsCancelled(editSession.isCancelled)
    setTopicTags(parseTopicTags(editSession.topicTags ?? '[]'))
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
      const parsed = JSON.parse(editSession.suggestedDifficulties || '[]') as unknown[]
      setSuggestedDifficulties(Array.isArray(parsed) ? parsed.filter(isSuggestedDifficulty) : [])
    } catch { setSuggestedDifficulties([]) }
    initializedForIdRef.current = editSession.id
  }, [editSession])

  // Autosave
  const getFormDataRef = useRef<(() => CreateSessionLogRequest) | null>(null)

  useEffect(() => {
    const dur = durationChoice === 'other'
      ? (parseInt(durationOther, 10) || null)
      : parseInt(durationChoice, 10)

    getFormDataRef.current = (): CreateSessionLogRequest => ({
      sessionDate: sessionDate ? `${sessionDate}T${sessionTime || '00:00'}:00` : null,
      actualContent: isCancelled ? null : (actualContent || null),
      plannedContent: prevSession?.nextSessionTopics || null,
      homeworkAssigned: isCancelled ? null : (homeworkAssigned || null),
      // Group sessions don't use the per-student tri-state; send NotApplicable
      previousHomeworkStatus: 'NotApplicable',
      nextSessionTopics: isCancelled ? null : (nextSessionTopics || null),
      generalNotes: generalNotes || null,
      levelReassessmentSkill: null,
      levelReassessmentLevel: null,
      linkedLessonId: null,
      topicTags: topicTags.length > 0 ? serializeTopicTags(topicTags) : null,
      isCancelled,
      status: 'Confirmed',
      mentionedDifficultyPairs: [],
      suggestedDifficulties: suggestedDifficulties.length > 0 ? suggestedDifficulties : undefined,
      duration: dur,
      title: sessionTitle || null,
      ...(voiceNoteId ? { voiceNoteId } : {}),
      ...(voiceNoteTranscription ? { voiceNoteTranscription } : {}),
      ...(rawExtractionJson ? { rawExtractionJson } : {}),
    })
  }, [
    sessionDate, sessionTime, durationChoice, durationOther, isCancelled,
    actualContent, homeworkAssigned, nextSessionTopics, generalNotes, topicTags,
    voiceNoteId, prevSession, suggestedDifficulties,
    sessionTitle, voiceNoteTranscription, rawExtractionJson,
  ])

  useEffect(() => { durationChoiceRef.current = durationChoice }, [durationChoice])
  useEffect(() => {
    latestFieldsRef.current = { actualContent, generalNotes, homeworkAssigned, nextSessionTopics }
  }, [actualContent, generalNotes, homeworkAssigned, nextSessionTopics])
  useEffect(() => { sessionDateRef.current = sessionDate }, [sessionDate])
  useEffect(() => { sessionTimeRef.current = sessionTime }, [sessionTime])

  const { status: saveStatus, sessionId: autosavedSessionId, lastSavedAt, scheduleTextSave, saveNow } = useGroupSessionAutosave(
    groupId ?? undefined,
    getFormDataRef,
    sessionId,
  )

  const doneNavTarget = isEditMode ? `/groups/${groupId}?tab=sessions` : `/groups/${groupId}`

  const doneBusy = isDone || saveStatus === 'saving'

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

  async function handleBack() {
    if (isEditMode) {
      // Edit mode: autosave persists every change to the existing session, so there is
      // nothing to "discard". Flush any pending debounced save, then navigate. If the
      // flush fails, do NOT navigate (the teacher would think edits were saved).
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
    // Create mode: the discard banner still makes sense because autosave progressively
    // creates a draft the teacher may want to throw away.
    if (hasChanges || !!autosavedSessionId) {
      setShowDiscardConfirm(true)
      return
    }
    navigate(doneNavTarget)
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
      let sid = autosavedSessionId
      if (!sid && hasChanges) {
        sid = await saveNow()
        if (!sid) {
          setDoneError('Failed to save session. Please try again.')
          setIsDone(false)
          return
        }
      } else if (sid && hasChanges) {
        await saveNow()
      }

      if (!isCancelled && groupId) {
        // Group-scoped Teaching Ideas: persist to group profile (NOT to student profiles)
        await Promise.allSettled(
          newTodos.map(text => appendGroupTeachingIdea(groupId, text))
        )
        // Group-scoped Followups: deferred to #1329 group followup API
      }

      queryClient.invalidateQueries({ queryKey: ['group-sessions', groupId] })
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      if (isEditMode) queryClient.invalidateQueries({ queryKey: ['group-session', groupId, sessionId] })

      navigate(doneNavTarget)
    } catch (err) {
      logger.error('GroupLogSession', 'done handler failed', err)
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !doneBusy) {
        e.preventDefault()
        void handleDone()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneBusy])

  // Scroll gradient
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
  }, [groupLoading])

  const tagSuggestions = useMemo(
    () => suggestTopicTags(actualContent, topicTags),
    [actualContent, topicTags],
  )

  if (!groupId) {
    return (
      <div className="p-8 flex flex-col gap-3" data-testid="group-log-session-no-target">
        <p className="text-sm text-red-600 font-medium">No group selected. Please open this page from a group's Log Session button.</p>
        <button type="button" onClick={() => navigate('/groups')} className="self-start text-sm text-indigo-600 hover:underline">
          Back to Groups
        </button>
      </div>
    )
  }

  if (groupLoading || (isEditMode && editSessionLoading)) {
    return (
      <div className="p-8 space-y-4" data-testid="group-log-session-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="p-8 flex flex-col gap-3" data-testid="group-log-session-not-found">
        <p className="text-sm text-zinc-500">Group not found.</p>
        <button type="button" onClick={() => navigate('/groups')} className="self-start text-sm text-indigo-600 hover:underline">
          Back to Groups
        </button>
      </div>
    )
  }

  if (isEditMode && editSessionError) {
    return (
      <div className="p-8 flex flex-col gap-3" data-testid="group-session-not-found">
        <p className="text-sm text-zinc-500">Session not found.</p>
        <button type="button" onClick={() => navigate(`/groups/${groupId}?tab=sessions`)} className="self-start text-sm text-indigo-600 hover:underline">
          Back to group
        </button>
      </div>
    )
  }

  const members = group.members ?? []

  return (
    <div className="flex h-full min-h-0" data-testid="group-log-session-page">
      {/* Left panel: Group Context */}
      <aside
        ref={asideRef}
        className="relative w-[35%] shrink-0 overflow-y-auto px-6 py-8 space-y-6"
        style={{ background: '#F4F2FD' }}
        data-testid="group-log-session-left-panel"
      >
        {/* Group mini-identity block */}
        <div className="flex items-start gap-3">
          <GroupAvatarCluster
            size="lg"
            members={members.slice(0, 4)}
            totalCount={group.memberCount}
            className="shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline text-base font-bold text-[#1A1B22] leading-tight" data-testid="group-name">
                {group.name}
              </h2>
              {group.cefrLevel && <CefrBadge level={group.cefrLevel} data-testid="group-cefr-badge" />}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5" data-testid="group-member-count">
              {group.memberCount} student{group.memberCount === 1 ? '' : 's'}
            </p>
            {!sessionsLoading && (
              <p className="text-xs text-zinc-400 mt-0.5" data-testid="session-number">Session #{sessionNumber}</p>
            )}
          </div>
        </div>

        {/* Members disclosure */}
        {members.length > 0 && (
          <PanelSection label="">
            <button
              type="button"
              onClick={() => setMembersExpanded(v => !v)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-indigo-600 transition-colors"
              data-testid="members-disclosure-toggle"
            >
              <Users className="h-3 w-3" />
              <span>Members ({group.memberCount})</span>
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${membersExpanded ? 'rotate-180' : ''}`} />
            </button>
            {membersExpanded && (
              <div className="space-y-1.5 mt-1" data-testid="members-disclosure-list">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex items-center justify-center rounded-full text-[0.6rem] font-bold shrink-0',
                        getAvatarColor(m.id),
                      )}
                      style={{ width: 24, height: 24 }}
                      aria-hidden
                    >
                      {getInitials(m.name)}
                    </div>
                    <span className="text-sm text-[#1A1B22] truncate">{m.name}</span>
                    {m.cefrLevel && <CefrBadge level={m.cefrLevel} />}
                  </div>
                ))}
              </div>
            )}
          </PanelSection>
        )}

        {/* Previous Homework - read-only reference card (no tri-state toggle for group sessions) */}
        {prevSession?.homeworkAssigned && (
          <PanelSection label="Previous Homework">
            <div
              className="rounded-lg bg-white px-3 py-2.5 space-y-1"
              style={{ boxShadow: '0 1px 4px rgba(26,27,34,0.06)' }}
              data-testid="prev-homework-readonly"
            >
              <p className="text-xs text-zinc-400">Last session</p>
              <p className="text-sm text-zinc-700 leading-snug">{prevSession.homeworkAssigned}</p>
              <p className="text-[0.6875rem] text-indigo-400 mt-0.5">Homework status is tracked per student</p>
            </div>
          </PanelSection>
        )}

        {/* Last Session summary */}
        {prevSession ? (
          <PanelSection label={`Last Session (#${nonCancelledSessions.length})`}>
            <div className="rounded-lg bg-white px-3 py-2.5 space-y-1" style={{ boxShadow: '0 1px 4px rgba(26,27,34,0.06)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">{formatDate(prevSession.sessionDate)}</p>
                {prevSession.duration && (
                  <p className="text-xs text-zinc-400">{prevSession.duration} min</p>
                )}
              </div>
              {prevSession.actualContent && (
                <p className="text-sm text-[#1A1B22] line-clamp-3 leading-snug">{prevSession.actualContent}</p>
              )}
            </div>
          </PanelSection>
        ) : !sessionsLoading ? (
          <PanelSection label="Last Session">
            <div className="rounded-lg bg-white px-3 py-2.5 text-center" style={{ boxShadow: '0 1px 4px rgba(26,27,34,0.06)' }} data-testid="first-session-empty">
              <p className="text-sm font-medium text-indigo-600">First session!</p>
              <p className="text-xs text-zinc-400 mt-0.5">Great start with this group.</p>
            </div>
          </PanelSection>
        ) : null}

        {/* Scroll sentinel */}
        <div ref={scrollSentinelRef} className="h-px shrink-0" aria-hidden />

        {showScrollGradient && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-8"
            style={{ background: 'linear-gradient(to top, #F4F2FD, transparent)' }}
            aria-hidden
          />
        )}
      </aside>

      {/* Right panel: Session Log Form */}
      <main className="flex-1 overflow-y-auto min-h-0" data-testid="group-log-session-right-panel">
        <div className="px-8 py-8 space-y-6 max-w-2xl">

          {/* Header bar */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={doneBusy}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-[#1A1B22] hover:bg-[#F4F2FD] transition-colors disabled:opacity-40"
              aria-label="Back to group"
              data-testid="back-button"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

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
              {saveStatus === 'idle' && lastSavedAt && (
                <span className="text-zinc-400">Last saved {relativeTime(lastSavedAt)}</span>
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
            <div className="flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-2.5 text-sm" data-testid="discard-confirm-bar">
              <span className="text-zinc-700">You have unsaved changes. Discard this session?</span>
              <div className="ml-auto flex items-center gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowDiscardConfirm(false)} className="text-zinc-600 hover:text-zinc-800" data-testid="keep-editing-btn">
                  Keep Editing
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={handleDiscard} className="text-red-600 hover:bg-red-50" data-testid="discard-btn">
                  Discard
                </Button>
              </div>
            </div>
          )}

          {/* Undo extraction bar */}
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

          {/* Voice recorder */}
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
                if (!transcription || !groupId) {
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
                if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current)
                setPulsingFields(new Set())
                setExtractedFields(new Set())
                setIsExtracting(true)
                extractGroupSessionReflection(groupId, transcription)
                  .then(extracted => {
                    const saveOverride: Partial<CreateSessionLogRequest> = {
                      voiceNoteId: note.id,
                      voiceNoteTranscription: transcription,
                    }
                    const json = extracted.rawExtractionJson ?? null
                    if (json) { saveOverride.rawExtractionJson = json; setRawExtractionJson(json) }
                    if (extracted.sessionTitle) { saveOverride.title = extracted.sessionTitle; setSessionTitle(extracted.sessionTitle) }

                    const applyMode = (existing: string, field: { value: string | null; mode: string } | null): string | null => {
                      if (!field || !field.value || field.mode === 'skip') return null
                      if (field.mode === 'replace') return field.value
                      return existing ? `${existing} ${field.value}` : field.value
                    }
                    const { actualContent: curActual, generalNotes: curNotes, homeworkAssigned: curHW, nextSessionTopics: curNext } = latestFieldsRef.current
                    const nextActual = applyMode(curActual, extracted.whatWasCovered)
                    if (nextActual !== null) { saveOverride.actualContent = nextActual; setActualContent(nextActual) }

                    let nextNotes: string | null = null
                    if (extracted.areasToImprove || extracted.emotionalSignals) {
                      const areasValue = extracted.areasToImprove?.mode !== 'skip' ? extracted.areasToImprove?.value : null
                      const combinedValue = [areasValue, extracted.emotionalSignals].filter(Boolean).join(' ')
                      const effectiveMode = areasValue ? (extracted.areasToImprove?.mode ?? 'replace') : 'replace'
                      const combinedField = combinedValue ? { value: combinedValue, mode: effectiveMode } : null
                      nextNotes = applyMode(curNotes, combinedField)
                      if (nextNotes !== null) { saveOverride.generalNotes = nextNotes; setGeneralNotes(nextNotes) }
                    }

                    const nextHW = applyMode(curHW, extracted.homeworkAssigned)
                    if (nextHW !== null) { saveOverride.homeworkAssigned = nextHW; setHomeworkAssigned(nextHW) }
                    const nextNext = applyMode(curNext, extracted.nextSessionTopics)
                    if (nextNext !== null) { saveOverride.nextSessionTopics = nextNext; setNextSessionTopics(nextNext) }

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

                    if (extracted.teachingTodos && extracted.teachingTodos.length > 0)
                      setNewTodos(prev => [...prev, ...extracted.teachingTodos!.filter(t => !prev.includes(t))])
                    if (extracted.teacherFollowups && extracted.teacherFollowups.length > 0)
                      setNewFollowups(prev => [...prev, ...extracted.teacherFollowups!.filter(f => !prev.includes(f))])

                    const changed = new Set<string>()
                    if (extracted.sessionTitle && extracted.sessionTitle !== snapshot.sessionTitle) changed.add('sessionTitle')
                    if (datePart && datePart !== snapshot.sessionDate) changed.add('sessionDate')
                    if (extracted.sessionStartTime && extracted.sessionStartTime !== snapshot.sessionTime) changed.add('sessionTime')
                    else if (!extracted.sessionStartTime && embeddedTime && embeddedTime !== snapshot.sessionTime) changed.add('sessionTime')
                    if (extracted.durationMinutes && durationChoiceRef.current === '50') {
                      const presets = ['25', '30', '45', '50', '60', '90']
                      if (presets.includes(String(extracted.durationMinutes)) ? String(extracted.durationMinutes) : 'other' !== snapshot.durationChoice) changed.add('durationChoice')
                    }
                    if (nextActual !== null && nextActual !== snapshot.actualContent) changed.add('actualContent')
                    if (nextNotes !== null && nextNotes !== snapshot.generalNotes) changed.add('generalNotes')
                    if (nextHW !== null && nextHW !== snapshot.homeworkAssigned) changed.add('homeworkAssigned')
                    if (nextNext !== null && nextNext !== snapshot.nextSessionTopics) changed.add('nextSessionTopics')
                    if (
                      extracted.topicTags && extracted.topicTags.length > 0 &&
                      extracted.topicTags.some(t => !snapshot.topicTags.some(s => s.tag.toLowerCase() === t.tag.toLowerCase()))
                    ) changed.add('topicTags')

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
                    logger.error('GroupLogSession', 'Voice note extraction failed', err)
                    setExtractionError('Could not analyse the recording. Fields were not filled in automatically.')
                    setExtractionSnapshot(null)
                    markChangedAndSaveNow({ voiceNoteId: note.id, voiceNoteTranscription: transcription })
                  })
                  .finally(() => setIsExtracting(false))
              }}
            />
          </div>

          {isExtracting && (
            <div className="flex items-center gap-2 px-1 text-xs text-indigo-600" data-testid="extracting-indicator">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Analysing session...</span>
            </div>
          )}
          {extractionError && !isExtracting && (
            <p className="px-1 text-xs text-red-500" data-testid="extraction-error">{extractionError}</p>
          )}

          {/* Metadata bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl px-4 py-3" style={{ background: '#F4F2FD' }}>
            <div className="space-y-1">
              <Label htmlFor="session-date" className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Date</Label>
              <Input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={e => { setSessionDate(e.target.value); trackManualEdit('sessionDate'); markChangedAndSchedule() }}
                className={`text-sm bg-zinc-100 border-none h-8 px-2.5 focus-visible:ring-2 focus-visible:ring-indigo-500/20 ${fieldMarkerClass('sessionDate')}`}
                data-testid="session-date"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="session-time" className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Time</Label>
              <Input
                id="session-time"
                type="time"
                value={sessionTime}
                onChange={e => { setSessionTime(e.target.value); trackManualEdit('sessionTime'); markChangedAndSchedule() }}
                className={`text-sm bg-zinc-100 border-none h-8 px-2.5 focus-visible:ring-2 focus-visible:ring-indigo-500/20 ${fieldMarkerClass('sessionTime')}`}
                data-testid="session-time"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="duration" className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Duration</Label>
              <div className="flex items-center gap-2">
                <Select value={durationChoice} onValueChange={(v) => { const val = v ?? durationChoice; setDurationChoice(val); trackManualEdit('durationChoice'); markChangedAndSaveNow({ duration: val === 'other' ? null : parseInt(val, 10) }) }}>
                  <SelectTrigger id="duration" className={`text-sm bg-zinc-100 border-none h-8 px-2.5 focus-visible:ring-2 focus-visible:ring-indigo-500/20 flex-1 ${fieldMarkerClass('durationChoice')}`} data-testid="duration-select">
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
            <div className="space-y-1">
              <span className="block text-xs invisible" aria-hidden="true">&nbsp;</span>
              <div className="flex items-center gap-2 h-8">
                <Label htmlFor="cancelled-toggle" className="text-sm text-zinc-600 cursor-pointer select-none">Cancelled</Label>
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

          {!isCancelled && (
            <>
              <div className="space-y-0.5">
                <h1 className="font-headline text-2xl font-bold text-[#1A1B22]" data-testid="page-heading">
                  What Happened?
                </h1>
                <p className="text-sm text-zinc-400">Reflect on the session flow and group engagement.</p>
              </div>

              {/* What Happened textarea */}
              <div className="space-y-1">
                {prevSession?.nextSessionTopics && (
                  <div className="flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs text-indigo-700" style={{ background: '#EEF0FD' }}>
                    <span className="font-medium shrink-0">Planned:</span>
                    <span className="italic line-clamp-2">{prevSession.nextSessionTopics}</span>
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

              {/* Difficulties Observed */}
              <div className="space-y-1" data-testid="difficulties-observed-section">
                <Label className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">Difficulties Observed</Label>
                <p className="text-[0.6875rem] text-zinc-400 -mt-1">Group-level difficulties detected from voice notes or added manually</p>
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
                        onClick={() => { setSuggestedDifficulties(prev => prev.filter((_, j) => j !== i)); markChangedAndSchedule() }}
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

              {/* Teaching Ideas + Followups (group-scoped; persist to group profile on Done) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 rounded-xl p-4" style={{ background: '#F0EFFF' }}>
                  <p className="text-xs font-medium uppercase tracking-wider text-indigo-600">New Teaching Ideas</p>
                  <p className="text-[0.6875rem] text-indigo-400 -mt-1">Saved to group profile</p>
                  {newTodos.map((text, idx) => (
                    <div key={idx} className="flex items-center gap-2" data-testid="new-todo-item">
                      <span className="flex-1 text-sm text-[#1A1B22]">{text}</span>
                      <button type="button" onClick={() => removeTodo(idx)} className="text-zinc-400 hover:text-red-500 transition-colors" aria-label="Remove todo">
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

                <div className="space-y-2 rounded-xl p-4" style={{ background: '#FFFBEB' }}>
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-600">New Followups</p>
                  <p className="text-[0.6875rem] text-amber-400 -mt-1">Group-scoped followups</p>
                  {newFollowups.map((text, idx) => (
                    <div key={idx} className="flex items-center gap-2" data-testid="new-followup-item">
                      <span className="flex-1 text-sm text-[#1A1B22]">{text}</span>
                      <button type="button" onClick={() => removeFollowup(idx)} className="text-zinc-400 hover:text-red-500 transition-colors" aria-label="Remove followup">
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
                {secondaryOpen ? 'Hide additional sections' : 'Show notes...'}
              </button>

              {secondaryOpen && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <Label htmlFor="general-notes" className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">Notes</Label>
                    <Textarea
                      id="general-notes"
                      value={generalNotes}
                      onChange={e => { setGeneralNotes(e.target.value); trackManualEdit('generalNotes'); markChangedAndSchedule() }}
                      placeholder="Observations on group mood, energy levels, context..."
                      rows={3}
                      className={`resize-none text-sm bg-white ${fieldMarkerClass('generalNotes')}`}
                      data-testid="general-notes"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Cancelled session */}
          {isCancelled && (
            <div className="space-y-1">
              <div className="bg-amber-50 rounded p-3 text-sm text-amber-800">This session was cancelled. Only date, duration, topics covered and notes will be recorded.</div>
              <div className="space-y-1 pt-4">
                <Label className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">Topics Covered</Label>
                <div className={`rounded-md ${fieldMarkerClass('topicTags', { wrapper: true })}`}>
                  <TopicTagsInput
                    value={topicTags}
                    onChange={(tags) => { setTopicTags(tags); trackManualEdit('topicTags'); markChangedAndSaveNow({ topicTags: tags.length > 0 ? serializeTopicTags(tags) : null }) }}
                  />
                </div>
              </div>
              <div className="space-y-1 pt-2">
                <Label htmlFor="general-notes" className="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-zinc-400">Notes</Label>
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
            </div>
          )}

          {doneError && (
            <div className="rounded-lg px-4 py-3 bg-red-50 text-sm text-red-700" data-testid="done-error">{doneError}</div>
          )}
        </div>
      </main>
    </div>
  )
}
