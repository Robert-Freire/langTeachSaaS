import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
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
  parseTopicTags,
  serializeTopicTags,
  type TopicTag,
  type SessionLog,
} from '../../api/sessionLogs'
import { getLessons } from '../../api/lessons'

const HOMEWORK_STATUSES = [
  { value: 'Done', label: 'Done' },
  { value: 'Partial', label: 'Partial' },
  { value: 'NotDone', label: 'Not done' },
  { value: 'NotApplicable', label: 'Not applicable' },
]

const SKILLS = ['Speaking', 'Writing', 'Reading', 'Listening']

const CEFR_SUBLEVELS = new Set([
  'A1.1','A1.2','A2.1','A2.2',
  'B1.1','B1.2','B2.1','B2.2',
  'C1.1','C1.2','C2.1','C2.2',
])

function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export interface SessionLogDialogProps {
  studentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  linkedLessonId?: string | null
  lessonTitle?: string | null
  lessonObjectives?: string | null
  initialSession?: SessionLog | null
}

export function SessionLogDialog({
  studentId,
  open,
  onOpenChange,
  linkedLessonId,
  lessonTitle,
  lessonObjectives,
  initialSession,
}: SessionLogDialogProps) {
  const isEditMode = initialSession != null
  const queryClient = useQueryClient()

  // Form state
  const [sessionDate, setSessionDate] = useState(todayIso())
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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pre-populate fields when editing an existing session
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open && initialSession) {
      setSessionDate(initialSession.sessionDate.split('T')[0])
      setPlannedContent(initialSession.plannedContent ?? '')
      setActualContent(initialSession.actualContent ?? '')
      setHomeworkAssigned(initialSession.homeworkAssigned ?? '')
      setPrevHomeworkStatus(initialSession.previousHomeworkStatusName ?? 'NotApplicable')
      setNextSessionTopics(initialSession.nextSessionTopics ?? '')
      setGeneralNotes(initialSession.generalNotes ?? '')
      setTopicTags(parseTopicTags(initialSession.topicTags))
      setReassessmentEnabled(!!initialSession.levelReassessmentSkill)
      setReassessmentSkill(initialSession.levelReassessmentSkill ?? '')
      setReassessmentLevel(initialSession.levelReassessmentLevel ?? '')
      setSelectedLessonId(initialSession.linkedLessonId ?? '')
    }
  }, [open, initialSession])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Auto-populate planned content from lesson (create mode only)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open && !initialSession && linkedLessonId && lessonObjectives) {
      const prefix = lessonTitle ? `${lessonTitle}: ` : ''
      setPlannedContent(`${prefix}${lessonObjectives}`)
    }
    if (open && !initialSession && linkedLessonId) {
      setSelectedLessonId(linkedLessonId)
    }
  }, [open, initialSession, linkedLessonId, lessonTitle, lessonObjectives])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reset form when dialog closes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      setSessionDate(todayIso())
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
      setErrors({})
      setSuccess(false)
      setSubmitError(null)
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
    queryKey: ['lessons', { pageSize: 100 }],
    queryFn: () => getLessons({ pageSize: 100 }),
    enabled: open,
  })
  const studentLessons = lessonsData?.items.filter(l => l.studentId === studentId) ?? []

  const { mutate: submitLog, isPending } = useMutation({
    mutationFn: () => {
      const payload = {
        sessionDate,
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

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!sessionDate) errs.sessionDate = 'Date is required.'
    else if (sessionDate > todayIso()) errs.sessionDate = 'Session date cannot be in the future.'
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                max={todayIso()}
                onChange={(e) => setSessionDate(e.target.value)}
                required
                data-testid="session-date"
                className="text-sm"
              />
              {errors.sessionDate && <p className="text-xs text-red-600">{errors.sessionDate}</p>}
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

            {/* Topic tags */}
            <div className="space-y-1">
              <Label className="text-sm">
                Topic tags
                <span className="text-zinc-400 font-normal ml-1">(optional)</span>
              </Label>
              <TopicTagsInput value={topicTags} onChange={setTopicTags} />
            </div>

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
                  onValueChange={(v) => setSelectedLessonId(v ?? '')}
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

            {submitError && (
              <p className="text-xs text-red-600" data-testid="session-log-error">{submitError}</p>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                data-testid="submit-session-log"
              >
                {isPending ? 'Saving...' : isEditMode ? 'Save changes' : 'Log session'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
