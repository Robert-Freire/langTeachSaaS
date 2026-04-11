import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFollowups, createFollowup, updateFollowupStatus } from '@/api/followups'
import type { TeacherFollowup } from '@/api/followups'
import { CheckCircle2, Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { logger } from '../../lib/logger'
import { TopicTagsInput } from './TopicTagsInput'
import {
  listSessions,
  createSession,
  updateSession,
  extractSessionReflection,
  parseTopicTags,
  serializeTopicTags,
  type TopicTag,
  type SessionLog,
  type SuggestedDifficulty,
} from '../../api/sessionLogs'
import { getLessons } from '../../api/lessons'
import { getStudent } from '../../api/students'
import { AudioRecorder } from '../audio/AudioRecorder'
import type { VoiceNote } from '../../api/voiceNotes'

function isSuggestedDifficulty(value: unknown): value is SuggestedDifficulty {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as SuggestedDifficulty).description === 'string' &&
    typeof (value as SuggestedDifficulty).competency === 'string' &&
    typeof (value as SuggestedDifficulty).subcategory === 'string' &&
    typeof (value as SuggestedDifficulty).severity === 'string'
  )
}

const HOMEWORK_STATUSES = [
  { value: 'Done', label: 'Done' },
  { value: 'Partial', label: 'Partial' },
  { value: 'NotDone', label: 'Not done' },
  { value: 'NotApplicable', label: 'Not applicable' },
]

const SKILLS = ['Speaking', 'Writing', 'Reading', 'Listening']

function buildPlannedContent(title: string | null | undefined, objectives: string | null | undefined): string {
  const prefix = title ? `${title}: ` : ''
  return `${prefix}${objectives ?? ''}`
}

const CEFR_SUBLEVELS = new Set([
  'A1.1','A1.2','A2.1','A2.2',
  'B1.1','B1.2','B2.1','B2.2',
  'C1.1','C1.2','C2.1','C2.2',
])


export interface SessionLogDialogProps {
  studentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  linkedLessonId?: string | null
  lessonTitle?: string | null
  lessonObjectives?: string | null
  initialSession?: SessionLog | null
  initialPlannedContent?: string | null
}

export function SessionLogDialog({
  studentId,
  open,
  onOpenChange,
  linkedLessonId,
  lessonTitle,
  lessonObjectives,
  initialSession,
  initialPlannedContent,
}: SessionLogDialogProps) {
  const isEditMode = initialSession != null
  const queryClient = useQueryClient()

  // Form state
  const [sessionDate, setSessionDate] = useState('')
  const [plannedContent, setPlannedContent] = useState('')
  const [actualContent, setActualContent] = useState('')
  const [homeworkAssigned, setHomeworkAssigned] = useState('')
  const [prevHomeworkStatus, setPrevHomeworkStatus] = useState('NotApplicable')
  const [nextSessionTopics, setNextSessionTopics] = useState('')
  const [generalNotes, setGeneralNotes] = useState('')
  const [topicTags, setTopicTags] = useState<TopicTag[]>([])
  const [reassessmentEnabled, setReassessmentEnabled] = useState(false)
  const [reassessmentSkill, setReassessmentSkill] = useState('')
  const [reassessmentLevel, setReassessmentLevel] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState(linkedLessonId ?? '')
  const [isCancelled, setIsCancelled] = useState(false)
  const [mentionedDifficultyKeys, setMentionedDifficultyKeys] = useState<Set<string>>(new Set())
  const [suggestedDifficulties, setSuggestedDifficulties] = useState<SuggestedDifficulty[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editSnapshotRef = useRef<Record<string, string | boolean>>({})

  // Followup state
  const [newFollowupText, setNewFollowupText] = useState('')
  const [isAddingFollowup, setIsAddingFollowup] = useState(false)
  const [localFollowups, setLocalFollowups] = useState<TeacherFollowup[]>([])

  // Voice extraction state
  const [isExtracting, setIsExtracting] = useState(false)
  const [draftSessionId, setDraftSessionId] = useState<string | null>(null)
  const [extractionFailed, setExtractionFailed] = useState(false)
  const voiceRunRef = useRef(0)
  const sessionDateRef = useRef(sessionDate)
  useEffect(() => { sessionDateRef.current = sessionDate }, [sessionDate])

  // Pre-populate fields when editing an existing session
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open && initialSession) {
      const date = initialSession.sessionDate ? initialSession.sessionDate.split('T')[0] : ''
      const planned = initialSession.plannedContent ?? ''
      const actual = initialSession.actualContent ?? ''
      const homework = initialSession.homeworkAssigned ?? ''
      const prevHw = initialSession.previousHomeworkStatusName ?? 'NotApplicable'
      const nextTopics = initialSession.nextSessionTopics ?? ''
      const notes = initialSession.generalNotes ?? ''
      const cancelled = initialSession.isCancelled ?? false
      const raEnabled = !!initialSession.levelReassessmentSkill
      const raSkill = initialSession.levelReassessmentSkill ?? ''
      const raLevel = initialSession.levelReassessmentLevel ?? ''
      const linkedLesson = initialSession.linkedLessonId ?? ''
      const rawTopicTags = initialSession.topicTags ?? '[]'
      let mentionedKeysHash = ''
      try {
        const pairs = JSON.parse(initialSession.mentionedDifficultyPairs || '[]') as { Competency: string; Subcategory: string }[]
        mentionedKeysHash = pairs.map(p => `${p.Competency}|${p.Subcategory}`).sort().join(',')
      } catch { /* empty */ }
      editSnapshotRef.current = { date, planned, actual, homework, prevHw, nextTopics, notes, cancelled, raEnabled, raSkill, raLevel, linkedLesson, rawTopicTags, mentionedKeysHash }
      setSessionDate(date)
      setPlannedContent(planned)
      setActualContent(actual)
      setHomeworkAssigned(homework)
      setPrevHomeworkStatus(prevHw)
      setNextSessionTopics(nextTopics)
      setGeneralNotes(notes)
      setTopicTags(parseTopicTags(rawTopicTags))
      setReassessmentEnabled(raEnabled)
      setReassessmentSkill(raSkill)
      setReassessmentLevel(raLevel)
      setSelectedLessonId(linkedLesson)
      setIsCancelled(cancelled)
      try {
        const pairs = JSON.parse(initialSession.mentionedDifficultyPairs || '[]') as { Competency: string; Subcategory: string }[]
        setMentionedDifficultyKeys(new Set(pairs.map(p => `${p.Competency}|${p.Subcategory}`)))
      } catch {
        setMentionedDifficultyKeys(new Set())
      }
      try {
        const parsed: unknown = JSON.parse(initialSession.suggestedDifficulties || '[]')
        setSuggestedDifficulties(Array.isArray(parsed) ? parsed.filter(isSuggestedDifficulty) : [])
      } catch {
        setSuggestedDifficulties([])
      }
    }
  }, [open, initialSession])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Auto-populate planned content from lesson (create mode only)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open && !initialSession && linkedLessonId && lessonObjectives) {
      setPlannedContent(buildPlannedContent(lessonTitle, lessonObjectives))
    }
    if (open && !initialSession && linkedLessonId) {
      setSelectedLessonId(linkedLessonId)
    }
  }, [open, initialSession, linkedLessonId, lessonTitle, lessonObjectives])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Pre-populate planned content from a prior session's NextSessionTopics (create mode, no linked lesson)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open && !initialSession && !linkedLessonId && initialPlannedContent) {
      setPlannedContent(initialPlannedContent)
    }
  }, [open, initialSession, linkedLessonId, initialPlannedContent])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reset form when dialog closes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      setSessionDate('')
      setPlannedContent('')
      setActualContent('')
      setHomeworkAssigned('')
      setPrevHomeworkStatus('NotApplicable')
      setNextSessionTopics('')
      setGeneralNotes('')
      setTopicTags([])
      setReassessmentEnabled(false)
      setReassessmentSkill('')
      setReassessmentLevel('')
      setSelectedLessonId(linkedLessonId ?? '')
      setIsCancelled(false)
      setMentionedDifficultyKeys(new Set())
      setSuggestedDifficulties([])
      setErrors({})
      setSuccess(false)
      setSubmitError(null)
      setShowDiscardConfirm(false)
      editSnapshotRef.current = {}
      voiceRunRef.current += 1
      setIsExtracting(false)
      setDraftSessionId(null)
      setExtractionFailed(false)
      setLocalFollowups([])
      setNewFollowupText('')
      setIsAddingFollowup(false)
    }
  }, [open, linkedLessonId])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Fetch previous session to determine if prev homework field should show
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions', studentId],
    queryFn: () => listSessions(studentId),
    enabled: open,
  })

  const prevSession = sessions?.[0] ?? null
  const showPrevHomework = isEditMode || (prevSession !== null && prevSession.homeworkAssigned !== null)

  // Fetch lessons for linked lesson selector
  const { data: lessonsData } = useQuery({
    queryKey: ['lessons', { pageSize: 100, studentId }],
    queryFn: () => getLessons({ pageSize: 100, studentId }),
    enabled: open,
  })
  const studentLessons = lessonsData?.items ?? []

  const { data: studentData } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => getStudent(studentId),
    enabled: open,
  })
  const activeDifficulties = studentData?.difficulties.filter(d => d.status === 'Active') ?? []

  const { data: serverFollowups = [] } = useQuery({
    queryKey: ['followups', studentId],
    queryFn: () => getFollowups(studentId),
    enabled: open,
  })
  // Merge server followups with locally-added ones (avoid duplicates by id)
  const pendingFollowups = [
    ...serverFollowups.filter(f => f.status === 'pending'),
    ...localFollowups.filter(lf => !serverFollowups.some(sf => sf.id === lf.id)),
  ]

  async function handleAddFollowup() {
    const text = newFollowupText.trim()
    if (!text || isAddingFollowup) return
    setIsAddingFollowup(true)
    try {
      const created = await createFollowup({ text, studentId, sourceSessionLogId: draftSessionId ?? undefined })
      setLocalFollowups(prev => [...prev, created])
      setNewFollowupText('')
    } catch {
      // API failure - leave input intact so user can retry
    } finally {
      setIsAddingFollowup(false)
    }
  }

  async function handleToggleFollowup(f: TeacherFollowup) {
    const next = f.status === 'pending' ? 'done' : 'pending'
    try {
      await updateFollowupStatus(f.id, next)
      setLocalFollowups(prev => prev.map(lf => lf.id === f.id ? { ...lf, status: next } : lf))
    } catch {
      // API failure - leave UI unchanged
    }
  }

  const { mutate: submitLog, isPending } = useMutation({
    mutationFn: () => {
      const payload = {
        sessionDate: sessionDate || null,
        plannedContent: plannedContent || null,
        actualContent: actualContent || null,
        homeworkAssigned: homeworkAssigned || null,
        previousHomeworkStatus: prevHomeworkStatus,
        nextSessionTopics: nextSessionTopics || null,
        generalNotes: generalNotes || null,
        levelReassessmentSkill: reassessmentEnabled ? reassessmentSkill || null : null,
        levelReassessmentLevel: reassessmentEnabled ? reassessmentLevel || null : null,
        linkedLessonId: selectedLessonId || null,
        topicTags: topicTags.length > 0 ? serializeTopicTags(topicTags) : null,
        isCancelled,
        status: 'Confirmed' as const,
        suggestedDifficulties: suggestedDifficulties.length > 0 ? suggestedDifficulties : undefined,
        mentionedDifficultyPairs: (() => {
          // Include active difficulties that were checked in the UI.
          const activeKeys = new Set(activeDifficulties.map(d => `${d.competency}|${d.subcategory}`))
          const fromActive = activeDifficulties
            .filter(d => mentionedDifficultyKeys.has(`${d.competency}|${d.subcategory}`))
            .map(d => ({ Competency: d.competency, Subcategory: d.subcategory }))
          // Preserve originally-mentioned pairs that are no longer active (e.g. now Covered)
          // so re-editing a session doesn't silently drop their historical record.
          const preserved = [...mentionedDifficultyKeys]
            .filter(k => !activeKeys.has(k))
            .map(k => { const [c, s] = k.split('|'); return { Competency: c, Subcategory: s ?? '' } })
          return [...fromActive, ...preserved]
        })(),
      }
      if (draftSessionId) {
        return updateSession(studentId, draftSessionId, payload)
      }
      return isEditMode
        ? updateSession(studentId, initialSession.id, payload)
        : createSession(studentId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', studentId] })
      setSuccess(true)
      setSubmitError(null)
      closeTimerRef.current = setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    },
    onError: (err) => {
      logger.error('SessionLogDialog', 'session log submit failed', err)
      setSubmitError('Failed to save session. Please try again.')
    },
  })

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  async function handleVoiceNote(voiceNote: VoiceNote) {
    if (!voiceNote.transcription) {
      setExtractionFailed(true)
      return
    }
    const runId = ++voiceRunRef.current
    setIsExtracting(true)
    try {
      const extracted = await extractSessionReflection(studentId, voiceNote.transcription)
      if (runId !== voiceRunRef.current) return
      const notes = [extracted.areasToImprove, extracted.emotionalSignals]
        .filter(Boolean)
        .join('\n')
      // Pre-fill form fields from extraction
      /* eslint-disable react-hooks/set-state-in-effect */
      setActualContent(extracted.whatWasCovered ?? '')
      setHomeworkAssigned(extracted.homeworkAssigned ?? '')
      setNextSessionTopics(extracted.nextLessonIdeas ?? '')
      setGeneralNotes(notes)
      setSuggestedDifficulties(extracted.suggestedDifficulties ?? [])
      if (!sessionDateRef.current && extracted.sessionDate) setSessionDate(extracted.sessionDate)
      /* eslint-enable react-hooks/set-state-in-effect */
      if (runId !== voiceRunRef.current) return
      // Auto-save as Draft using full current form state + extracted fields
      const resolvedDate = sessionDateRef.current || extracted.sessionDate || null
      const draft = await createSession(studentId, {
        sessionDate: resolvedDate,
        plannedContent: plannedContent || null,
        actualContent: extracted.whatWasCovered ?? null,
        homeworkAssigned: extracted.homeworkAssigned ?? null,
        previousHomeworkStatus: prevHomeworkStatus,
        nextSessionTopics: extracted.nextLessonIdeas ?? null,
        generalNotes: notes || null,
        levelReassessmentSkill: reassessmentEnabled ? reassessmentSkill || null : null,
        levelReassessmentLevel: reassessmentEnabled ? reassessmentLevel || null : null,
        linkedLessonId: selectedLessonId || null,
        topicTags: topicTags.length > 0 ? serializeTopicTags(topicTags) : null,
        isCancelled,
        status: 'Draft',
        suggestedDifficulties: extracted.suggestedDifficulties?.length ? extracted.suggestedDifficulties : undefined,
        voiceNoteId: voiceNote.id,
        voiceNoteTranscription: voiceNote.transcription ?? undefined,
        rawExtractionJson: extracted.rawExtractionJson ?? undefined,
      })
      if (runId !== voiceRunRef.current) return
      setDraftSessionId(draft.id)
    } catch (err) {
      logger.error('SessionLogDialog', 'voice extraction or draft save failed', err)
      setExtractionFailed(true)
    } finally {
      setIsExtracting(false)
    }
  }

  const autoPlannedContent = !initialSession && linkedLessonId && lessonObjectives
    ? buildPlannedContent(lessonTitle, lessonObjectives)
    : (!initialSession && !linkedLessonId && initialPlannedContent)
      ? initialPlannedContent
      : ''

  const isDirty = isEditMode
    ? (
      sessionDate !== (editSnapshotRef.current.date ?? '') ||
      plannedContent !== (editSnapshotRef.current.planned ?? '') ||
      actualContent !== (editSnapshotRef.current.actual ?? '') ||
      homeworkAssigned !== (editSnapshotRef.current.homework ?? '') ||
      prevHomeworkStatus !== (editSnapshotRef.current.prevHw ?? 'NotApplicable') ||
      nextSessionTopics !== (editSnapshotRef.current.nextTopics ?? '') ||
      generalNotes !== (editSnapshotRef.current.notes ?? '') ||
      isCancelled !== (editSnapshotRef.current.cancelled ?? false) ||
      reassessmentEnabled !== (editSnapshotRef.current.raEnabled ?? false) ||
      reassessmentSkill !== (editSnapshotRef.current.raSkill ?? '') ||
      reassessmentLevel !== (editSnapshotRef.current.raLevel ?? '') ||
      selectedLessonId !== (editSnapshotRef.current.linkedLesson ?? '') ||
      serializeTopicTags(topicTags) !== (editSnapshotRef.current.rawTopicTags ?? '[]') ||
      [...mentionedDifficultyKeys].sort().join(',') !== (editSnapshotRef.current.mentionedKeysHash ?? '')
    )
    : (
      sessionDate !== '' ||
      plannedContent !== autoPlannedContent ||
      actualContent !== '' ||
      homeworkAssigned !== '' ||
      prevHomeworkStatus !== 'NotApplicable' ||
      nextSessionTopics !== '' ||
      generalNotes !== '' ||
      topicTags.length > 0 ||
      isCancelled ||
      reassessmentEnabled ||
      selectedLessonId !== (linkedLessonId ?? '') ||
      mentionedDifficultyKeys.size > 0 ||
      suggestedDifficulties.length > 0
    )

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) { onOpenChange(true); return }
    if (isDirty && !success) { setShowDiscardConfirm(true); return }
    onOpenChange(false)
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!plannedContent && !actualContent) {
      errs.content = 'At least one of "What was planned" or "What was actually done" is required.'
    }
    if (reassessmentEnabled) {
      if (!reassessmentSkill) {
        errs.reassessmentSkill = 'Skill is required when reassessment is enabled.'
      }
      if (!reassessmentLevel) {
        errs.reassessmentLevel = 'Level is required when reassessment is enabled.'
      } else {
        const normalized = reassessmentLevel.trim().toUpperCase()
        if (!CEFR_SUBLEVELS.has(normalized)) {
          errs.reassessmentLevel = 'Must be a valid CEFR sub-level (e.g. A1.1, B2.2).'
        }
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    submitLog()
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid="session-log-dialog"
      >
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Session' : 'Log Session'}</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3" data-testid="session-log-success">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium text-zinc-800">Session logged successfully</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Voice recording — create mode only, hidden after draft is saved */}
            {!isEditMode && !draftSessionId && (
              <div className="space-y-1" data-testid="voice-recorder-section">
                <Label className="text-sm">Record session notes</Label>
                {isExtracting ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="extracting-indicator">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extracting session notes...
                  </div>
                ) : (
                  <AudioRecorder
                    onVoiceNote={(note) => void handleVoiceNote(note)}
                    disabled={isExtracting}
                  />
                )}
                {extractionFailed && (
                  <p className="text-xs text-amber-700" data-testid="extraction-failed-message">
                    Could not extract fields from audio. Fill in the form manually.
                  </p>
                )}
              </div>
            )}

            {sessionsLoading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            )}

            {!isEditMode && prevSession?.nextSessionTopics?.trim() && (
              <div
                className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900"
                data-testid="prev-session-topics"
              >
                <span className="font-medium">From last session: </span>
                {prevSession.nextSessionTopics}
              </div>
            )}

            {/* Date */}
            <div className="space-y-1">
              <Label htmlFor="session-date" className="text-sm">Date</Label>
              <Input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                data-testid="session-date"
                className="text-sm"
              />
              {sessionDate && (
                <p className="text-xs text-zinc-400" data-testid="session-date-iso">{sessionDate}</p>
              )}
              {errors.sessionDate && <p className="text-xs text-red-600">{errors.sessionDate}</p>}
            </div>

            {/* Cancelled toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="cancelled-toggle"
                checked={isCancelled}
                onChange={(e) => setIsCancelled(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
                data-testid="cancelled-toggle"
              />
              <Label htmlFor="cancelled-toggle" className="text-sm cursor-pointer">
                Cancelled
              </Label>
            </div>

            {/* Planned content */}
            <div className="space-y-1">
              <Label htmlFor="planned-content" className="text-sm">
                What was planned
                <span className="text-zinc-400 font-normal ml-1">(optional)</span>
              </Label>
              <Textarea
                id="planned-content"
                value={plannedContent}
                onChange={(e) => setPlannedContent(e.target.value)}
                placeholder="What you intended to cover..."
                rows={2}
                className="resize-none text-sm"
                data-testid="planned-content"
              />
            </div>

            {/* Actual content */}
            <div className="space-y-1">
              <Label htmlFor="actual-content" className="text-sm">
                What was actually done
                <span className="text-zinc-400 font-normal ml-1">(optional)</span>
              </Label>
              <Textarea
                id="actual-content"
                value={actualContent}
                onChange={(e) => setActualContent(e.target.value)}
                placeholder="What actually happened in the session..."
                rows={2}
                className="resize-none text-sm"
                data-testid="actual-content"
              />
              {errors.content && <p className="text-xs text-red-600">{errors.content}</p>}
            </div>

            {/* Homework assigned */}
            <div className="space-y-1">
              <Label htmlFor="homework-assigned" className="text-sm">
                Homework assigned
                <span className="text-zinc-400 font-normal ml-1">(optional)</span>
              </Label>
              <Input
                id="homework-assigned"
                value={homeworkAssigned}
                onChange={(e) => setHomeworkAssigned(e.target.value)}
                placeholder="Describe any homework..."
                className="text-sm"
                data-testid="homework-assigned"
              />
            </div>

            {/* Previous homework status — conditional */}
            {showPrevHomework && (
              <div className="space-y-1">
                <Label htmlFor="prev-homework-status" className="text-sm">
                  Previous homework status
                </Label>
                <Select value={prevHomeworkStatus} onValueChange={(v) => setPrevHomeworkStatus(v ?? 'NotApplicable')}>
                  <SelectTrigger
                    id="prev-homework-status"
                    className="text-sm"
                    data-testid="prev-homework-status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOMEWORK_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Topics for next session */}
            <div className="space-y-1">
              <Label htmlFor="next-session-topics" className="text-sm">
                Topics for next session
                <span className="text-zinc-400 font-normal ml-1">(optional)</span>
              </Label>
              <Textarea
                id="next-session-topics"
                value={nextSessionTopics}
                onChange={(e) => setNextSessionTopics(e.target.value)}
                placeholder="What to focus on next time..."
                rows={3}
                className="resize-none text-sm"
                data-testid="next-session-topics"
              />
            </div>

            {/* General notes */}
            <div className="space-y-1">
              <Label htmlFor="general-notes" className="text-sm">
                General notes
                <span className="text-zinc-400 font-normal ml-1">(optional)</span>
              </Label>
              <Textarea
                id="general-notes"
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Learning style, student mood, context..."
                rows={3}
                className="resize-none text-sm"
                data-testid="general-notes"
              />
            </div>

            {/* Suggested difficulties (from AI extraction) */}
            {suggestedDifficulties.length > 0 && (
              <div className="space-y-2" data-testid="suggested-difficulties">
                <Label className="text-sm">
                  Suggested difficulties
                  <span className="text-zinc-400 font-normal ml-1">(from session notes — remove any that look wrong)</span>
                </Label>
                <div className="space-y-1">
                  {suggestedDifficulties.map((d, i) => (
                    <div
                      key={`${d.competency}|${d.subcategory}|${i}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm"
                      data-testid="suggested-difficulty-item"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-zinc-800">{d.description}</span>
                        <span className="ml-2 text-xs text-zinc-400">
                          {d.competency}{d.subcategory ? ` / ${d.subcategory}` : ''} · {d.severity}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSuggestedDifficulties(prev => prev.filter((_, j) => j !== i))}
                        className="shrink-0 text-zinc-400 hover:text-zinc-700 text-base leading-none"
                        aria-label="Remove difficulty"
                        data-testid="remove-suggested-difficulty"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Topic tags */}
            <div className="space-y-1">
              <Label className="text-sm">
                Topic tags
                <span className="text-zinc-400 font-normal ml-1">(optional)</span>
              </Label>
              <TopicTagsInput value={topicTags} onChange={setTopicTags} />
            </div>

            {/* Mentioned difficulties */}
            {activeDifficulties.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">
                  Difficulties observed this session
                  <span className="text-zinc-400 font-normal ml-1">(optional)</span>
                </Label>
                <div className="space-y-1">
                  {activeDifficulties.map((d) => {
                    const key = `${d.competency}|${d.subcategory}`
                    const checked = mentionedDifficultyKeys.has(key)
                    return (
                      <label
                        key={d.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                        data-testid={`mentioned-difficulty-${d.competency}-${d.subcategory}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setMentionedDifficultyKeys(prev => {
                              const next = new Set(prev)
                              if (checked) next.delete(key)
                              else next.add(key)
                              return next
                            })
                          }}
                          className="rounded border-zinc-300"
                        />
                        <span className="text-zinc-700">{d.description}</span>
                        <span className="text-xs text-zinc-400">({d.competency}{d.subcategory ? ` / ${d.subcategory}` : ''})</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Level reassessment toggle */}
            <div className="space-y-2 rounded-lg border border-zinc-200 p-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="reassessment-toggle"
                  checked={reassessmentEnabled}
                  onChange={(e) => setReassessmentEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
                  data-testid="reassessment-toggle"
                />
                <Label htmlFor="reassessment-toggle" className="text-sm cursor-pointer">
                  Level reassessment
                </Label>
              </div>

              {reassessmentEnabled && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="reassessment-skill" className="text-xs text-zinc-600">Skill</Label>
                    <Select value={reassessmentSkill} onValueChange={(v) => setReassessmentSkill(v ?? '')}>
                      <SelectTrigger
                        id="reassessment-skill"
                        className="text-sm"
                        data-testid="reassessment-skill"
                      >
                        <SelectValue placeholder="Select skill..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SKILLS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.reassessmentSkill && (
                      <p className="text-xs text-red-600">{errors.reassessmentSkill}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reassessment-level" className="text-xs text-zinc-600">
                      Reassessed level
                    </Label>
                    <Input
                      id="reassessment-level"
                      value={reassessmentLevel}
                      onChange={(e) => setReassessmentLevel(e.target.value)}
                      placeholder="e.g. A2.1"
                      className="text-sm"
                      data-testid="reassessment-level"
                    />
                    {errors.reassessmentLevel && (
                      <p className="text-xs text-red-600">{errors.reassessmentLevel}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Linked lesson */}
            {studentLessons.length > 0 && (
              <div className="space-y-1">
                <Label htmlFor="linked-lesson" className="text-sm">
                  Linked lesson
                  <span className="text-zinc-400 font-normal ml-1">(optional)</span>
                </Label>
                <Select
                  value={selectedLessonId ?? ''}
                  onValueChange={(v) => {
                    const id = v ?? ''
                    setSelectedLessonId(id)
                    const lesson = studentLessons.find(l => l.id === id)
                    if (lesson && !plannedContent) {
                      setPlannedContent(buildPlannedContent(lesson.title, lesson.objectives))
                    }
                  }}
                >
                  <SelectTrigger
                    id="linked-lesson"
                    className="text-sm"
                    data-testid="linked-lesson"
                  >
                    <SelectValue placeholder="Select a lesson..." />
                  </SelectTrigger>
                  <SelectContent>
                    {studentLessons.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Pending Followups context panel */}
            {pendingFollowups.length > 0 && (
              <div className="space-y-2" data-testid="session-pending-followups">
                <Label className="text-sm font-medium">Pending Followups</Label>
                <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50/50 p-3">
                  {pendingFollowups.map(f => (
                    <div key={f.id} className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleFollowup(f)}
                        aria-label="Mark done"
                        data-testid={`session-followup-toggle-${f.id}`}
                        className="mt-0.5 shrink-0 w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-100 hover:bg-amber-500 transition-colors"
                      />
                      <p className="text-sm text-[#1A1B22]">{f.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Followups quick-add */}
            <div className="rounded-md bg-amber-50 p-3 space-y-2" data-testid="session-new-followup-section">
              <Label className="text-sm font-medium">New Followups</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newFollowupText}
                  onChange={e => setNewFollowupText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFollowup() } }}
                  placeholder="Add a followup..."
                  className="flex-1 text-sm bg-white"
                  data-testid="session-followup-input"
                />
                <Button
                  type="button"
                  onClick={handleAddFollowup}
                  disabled={!newFollowupText.trim() || isAddingFollowup}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                  data-testid="session-followup-add-btn"
                >
                  Add
                </Button>
              </div>
              {localFollowups.length > 0 && (
                <div className="space-y-1">
                  {localFollowups.map(f => (
                    <p key={f.id} className="text-xs text-amber-800">+ {f.text}</p>
                  ))}
                </div>
              )}
            </div>

            {submitError && (
              <p className="text-xs text-red-600" data-testid="session-log-error">{submitError}</p>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending || isExtracting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                data-testid="submit-session-log"
              >
                {isPending ? 'Saving...' : draftSessionId ? 'Confirm' : isEditMode ? 'Save changes' : 'Log session'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
      <AlertDialogContent size="sm" data-testid="discard-confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>Discard them?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="keep-editing-btn">Keep editing</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            data-testid="discard-btn"
            onClick={() => { setShowDiscardConfirm(false); onOpenChange(false) }}
          >
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
