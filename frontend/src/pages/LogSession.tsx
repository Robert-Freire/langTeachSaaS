import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, X, AlertTriangle } from 'lucide-react'
import { getStudent, appendTeachingTodo, updateTeachingTodo } from '@/api/students'
import { listSessions, createSession, serializeTopicTags, type TopicTag } from '@/api/sessionLogs'
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
import { formatDate as formatDateUtil } from '@/utils/formatDate'
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
  { value: 'NotApplicable', label: 'Not applicable' },
]

const CEFR_SUBLEVELS = [
  'A1.1','A1.2','A2.1','A2.2',
  'B1.1','B1.2','B2.1','B2.2',
  'C1.1','C1.2','C2.1','C2.2',
]

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '--'
  return formatDateUtil(iso)
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

export default function LogSession() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Form state
  const [sessionDate, setSessionDate] = useState(todayISO())
  const [durationChoice, setDurationChoice] = useState('60')
  const [durationOther, setDurationOther] = useState('')
  const [isCancelled, setIsCancelled] = useState(false)
  const [prevHomeworkStatus, setPrevHomeworkStatus] = useState('NotApplicable')
  const [actualContent, setActualContent] = useState('')
  const [homeworkAssigned, setHomeworkAssigned] = useState('')
  const [nextSessionTopics, setNextSessionTopics] = useState('')
  const [generalNotes, setGeneralNotes] = useState('')
  const [topicTags, setTopicTags] = useState<TopicTag[]>([])
  const [reassessmentEnabled, setReassessmentEnabled] = useState(false)
  const [reassessmentLevel, setReassessmentLevel] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState('')

  // Left panel interactive state
  const [checkedTodoIds, setCheckedTodoIds] = useState<Set<string>>(new Set())
  const [checkedFollowupIds, setCheckedFollowupIds] = useState<Set<string>>(new Set())
  const [mentionedDifficultyKeys, setMentionedDifficultyKeys] = useState<Set<string>>(new Set())

  // Quick-add lists (applied on submit)
  const [newTodoText, setNewTodoText] = useState('')
  const [newTodos, setNewTodos] = useState<string[]>([])
  const [newFollowupText, setNewFollowupText] = useState('')
  const [newFollowups, setNewFollowups] = useState<string[]>([])

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const studentLessons = lessonsData?.items ?? []
  const prevSession = sessions[0] ?? null
  const sessionNumber = sessions.filter(s => !s.isCancelled).length + 1
  const pendingFollowups = allFollowups.filter(f => f.status === 'pending')
  const activeDifficulties = student?.difficulties.filter(d => d.status === 'Active') ?? []
  const pendingTodos = student?.teachingTodos.filter(t => t.status === 'Pending') ?? []
  const showPrevHomework = prevSession !== null && prevSession.homeworkAssigned !== null

  const plannedForToday = prevSession?.nextSessionTopics ?? null

  // Pre-populate "What Happened?" from planned-for-today when we first get sessions
  // This is done once: only if actualContent is still empty when sessions load
  const [didPrefill, setDidPrefill] = useState(false)
  if (!didPrefill && !sessionsLoading && plannedForToday && actualContent === '') {
    setActualContent(plannedForToday)
    setDidPrefill(true)
  }

  function resolvedDuration(): number | null {
    if (durationChoice === 'other') {
      const v = parseInt(durationOther, 10)
      return isNaN(v) || v <= 0 ? null : v
    }
    return parseInt(durationChoice, 10)
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!isCancelled && !actualContent.trim()) {
      errs.actualContent = 'Please describe what happened in the session.'
    }
    if (reassessmentEnabled && !reassessmentLevel.trim()) {
      errs.reassessmentLevel = 'Select a CEFR sub-level for reassessment.'
    }
    if (reassessmentEnabled && reassessmentLevel && !CEFR_SUBLEVELS.includes(reassessmentLevel.trim().toUpperCase())) {
      errs.reassessmentLevel = 'Must be a valid CEFR sub-level (e.g. B1.1, B2.2).'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !validate()) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const mentionedPairs = activeDifficulties
        .filter(d => mentionedDifficultyKeys.has(`${d.competency}|${d.subcategory}`))
        .map(d => ({ Competency: d.competency, Subcategory: d.subcategory }))

      const session = await createSession(id, {
        sessionDate: sessionDate || null,
        actualContent: isCancelled ? null : (actualContent || null),
        plannedContent: plannedForToday || null,
        homeworkAssigned: isCancelled ? null : (homeworkAssigned || null),
        previousHomeworkStatus: prevHomeworkStatus,
        nextSessionTopics: isCancelled ? null : (nextSessionTopics || null),
        generalNotes: generalNotes || null,
        levelReassessmentSkill: reassessmentEnabled ? 'General' : null,
        levelReassessmentLevel: reassessmentEnabled ? reassessmentLevel || null : null,
        linkedLessonId: selectedLessonId || null,
        topicTags: topicTags.length > 0 ? serializeTopicTags(topicTags) : null,
        isCancelled,
        status: 'Confirmed',
        mentionedDifficultyPairs: mentionedPairs,
        duration: resolvedDuration(),
      })

      // Run all side effects in parallel (best-effort, do not block navigation)
      await Promise.allSettled([
        ...[...checkedTodoIds].map(todoId =>
          updateTeachingTodo(id, todoId, { status: 'Covered', coveredInSessionLogId: session.id })
        ),
        ...[...checkedFollowupIds].map(followupId =>
          updateFollowupStatus(followupId, 'done')
        ),
        ...newTodos.map(text => appendTeachingTodo(id, text)),
        ...newFollowups.map(text => createFollowup({ text, studentId: id, sourceSessionLogId: session.id })),
      ])

      queryClient.invalidateQueries({ queryKey: ['sessions', id] })
      queryClient.invalidateQueries({ queryKey: ['student', id] })
      queryClient.invalidateQueries({ queryKey: ['followups', id] })

      navigate(`/students/${id}`)
    } catch (err) {
      logger.error('LogSession', 'session create failed', err)
      setSubmitError('Failed to save session. Please try again.')
    } finally {
      setIsSubmitting(false)
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

  if (studentLoading) {
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

  const sortedObjectives = [...(student.shortTermObjectives)].sort((a, b) => {
    const order = { overdue: 0, critical: 1, normal: 2 }
    const ua = order[getObjectiveUrgency(a.targetDate)]
    const ub = order[getObjectiveUrgency(b.targetDate)]
    if (ua !== ub) return ua - ub
    const da = getDaysRemaining(a.targetDate) ?? Infinity
    const db = getDaysRemaining(b.targetDate) ?? Infinity
    return da - db
  })

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
              <p className="text-[0.6875rem] text-indigo-500 mt-1">Checked items will be marked as covered on submit</p>
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
      </aside>

      {/* ─── Right panel: Session Log Form ───────────────────────────── */}
      <main className="flex-1 overflow-y-auto min-h-0" data-testid="log-session-right-panel">
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6 max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/students/${id}`)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-[#1A1B22] hover:bg-[#F4F2FD] transition-colors"
              aria-label="Back to student"
              data-testid="back-button"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-headline text-2xl font-bold text-[#1A1B22]">Log Session</h1>
              <p className="text-sm text-zinc-400">Session #{sessionNumber} &middot; {student.name}</p>
            </div>
          </div>

          {/* Row 1: Date + Duration + Cancelled */}
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1 min-w-[140px]">
              <Label htmlFor="session-date" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Date</Label>
              <Input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={e => setSessionDate(e.target.value)}
                className="text-sm bg-white"
                data-testid="session-date"
              />
            </div>

            <div className="space-y-1 min-w-[130px]">
              <Label htmlFor="duration" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Duration</Label>
              <Select value={durationChoice} onValueChange={(v) => setDurationChoice(v ?? durationChoice)}>
                <SelectTrigger id="duration" className="text-sm bg-white" data-testid="duration-select">
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
              <div className="space-y-1 min-w-[100px]">
                <Label htmlFor="duration-other" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Minutes</Label>
                <Input
                  id="duration-other"
                  type="number"
                  min="1"
                  value={durationOther}
                  onChange={e => setDurationOther(e.target.value)}
                  placeholder="e.g. 75"
                  className="text-sm bg-white"
                  data-testid="duration-other"
                />
              </div>
            )}

            <div className="flex items-center gap-2 pb-1">
              <input
                type="checkbox"
                id="cancelled-toggle"
                checked={isCancelled}
                onChange={e => setIsCancelled(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
                data-testid="cancelled-toggle"
              />
              <Label htmlFor="cancelled-toggle" className="text-sm cursor-pointer text-zinc-600">Cancelled</Label>
            </div>
          </div>

          {/* Previous Homework Status */}
          {showPrevHomework && !isCancelled && (
            <div className="space-y-1">
              <Label htmlFor="prev-homework-status" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Previous Homework Status
              </Label>
              <div className="flex gap-2 flex-wrap" data-testid="prev-homework-status">
                {PREV_HOMEWORK_STATUSES.filter(s => s.value !== 'NotApplicable').map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setPrevHomeworkStatus(s.value)}
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

          {/* What Happened */}
          {!isCancelled && (
            <div className="space-y-1">
              <Label htmlFor="actual-content" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                What Happened?
              </Label>
              {plannedForToday && (
                <div className="flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs text-indigo-700" style={{ background: '#EEF0FD' }}>
                  <span className="font-medium shrink-0">Reference:</span>
                  <span className="italic line-clamp-2">{plannedForToday}</span>
                </div>
              )}
              <Textarea
                id="actual-content"
                value={actualContent}
                onChange={e => setActualContent(e.target.value)}
                placeholder="Describe what happened in the session..."
                rows={6}
                className="resize-none text-sm bg-white"
                data-testid="actual-content"
              />
              {errors.actualContent && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {errors.actualContent}
                </p>
              )}
            </div>
          )}

          {/* Voice Note */}
          {!isCancelled && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Voice Note</Label>
              <AudioRecorder
                onVoiceNote={() => {
                  // Voice note uploaded - user can fill form manually
                }}
              />
            </div>
          )}

          {/* Homework Assigned */}
          {!isCancelled && (
            <div className="space-y-1">
              <Label htmlFor="homework-assigned" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Homework Assigned
              </Label>
              <Input
                id="homework-assigned"
                value={homeworkAssigned}
                onChange={e => setHomeworkAssigned(e.target.value)}
                placeholder="e.g. Workbook page 42, exercises 3-5"
                className="text-sm bg-white"
                data-testid="homework-assigned"
              />
            </div>
          )}

          {/* Next Session */}
          {!isCancelled && (
            <div className="space-y-1">
              <Label htmlFor="next-session-topics" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Next Session Plan
              </Label>
              <Textarea
                id="next-session-topics"
                value={nextSessionTopics}
                onChange={e => setNextSessionTopics(e.target.value)}
                placeholder="What to focus on next time..."
                rows={3}
                className="resize-none text-sm bg-white"
                data-testid="next-session-topics"
              />
            </div>
          )}

          {/* Teaching Todos quick-add */}
          {!isCancelled && (
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
                  placeholder="Add new todo..."
                  className="text-sm bg-white flex-1"
                  data-testid="new-todo-input"
                />
                <Button type="button" variant="ghost" size="sm" onClick={addTodo} className="text-indigo-600 hover:bg-indigo-50">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Followups quick-add */}
          {!isCancelled && (
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
                  placeholder="Add new followup..."
                  className="text-sm bg-white flex-1"
                  data-testid="new-followup-input"
                />
                <Button type="button" variant="ghost" size="sm" onClick={addFollowup} className="text-amber-600 hover:bg-amber-50">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Topics Covered */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Topics Covered</Label>
            <TopicTagsInput value={topicTags} onChange={setTopicTags} />
          </div>

          {/* Today's Context */}
          <div className="space-y-1">
            <Label htmlFor="general-notes" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Today's Context
            </Label>
            <Textarea
              id="general-notes"
              value={generalNotes}
              onChange={e => setGeneralNotes(e.target.value)}
              placeholder="Observations on mood, energy levels, context..."
              rows={3}
              className="resize-none text-sm bg-white"
              data-testid="general-notes"
            />
          </div>

          {/* Link to Lesson Plan */}
          {studentLessons.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="linked-lesson" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Link to Lesson Plan (optional)
              </Label>
              <Select value={selectedLessonId} onValueChange={(v) => setSelectedLessonId(v ?? selectedLessonId)}>
                <SelectTrigger id="linked-lesson" className="text-sm bg-white" data-testid="linked-lesson">
                  <SelectValue placeholder="Search lessons..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
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
              <input
                type="checkbox"
                id="reassessment-toggle"
                checked={reassessmentEnabled}
                onChange={e => setReassessmentEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
                data-testid="reassessment-toggle"
              />
              <Label htmlFor="reassessment-toggle" className="text-sm cursor-pointer text-zinc-600">
                Flag for Level Reassessment
              </Label>
            </div>
            {reassessmentEnabled && (
              <div className="space-y-1 ml-6">
                <Label htmlFor="reassessment-level" className="text-xs text-zinc-500">New CEFR sub-level</Label>
                <Select value={reassessmentLevel} onValueChange={(v) => setReassessmentLevel(v ?? reassessmentLevel)}>
                  <SelectTrigger id="reassessment-level" className="text-sm bg-white w-40" data-testid="reassessment-level">
                    <SelectValue placeholder="e.g. B1.1" />
                  </SelectTrigger>
                  <SelectContent>
                    {CEFR_SUBLEVELS.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.reassessmentLevel && (
                  <p className="text-xs text-red-600">{errors.reassessmentLevel}</p>
                )}
              </div>
            )}
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="rounded-lg px-4 py-3 bg-red-50 text-sm text-red-700 flex items-center gap-2" data-testid="submit-error">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[#F4F2FD]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(`/students/${id}`)}
              className="text-zinc-500 hover:text-[#1A1B22]"
              data-testid="cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-white px-6 rounded-xl font-medium"
              style={{ background: 'linear-gradient(135deg, #3525CD, #4F46E5)' }}
              data-testid="submit-button"
            >
              {isSubmitting ? 'Saving...' : 'Log Session'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
