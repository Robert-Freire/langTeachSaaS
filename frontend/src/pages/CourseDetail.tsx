import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronUp, ChevronDown, ChevronRight, Pencil, Loader2, BookOpen, Check, X } from 'lucide-react'
import {
  getCourse,
  reorderCurriculum,
  updateCurriculumEntry,
  markEntryAsTaught,
  generateLessonFromEntry,
  type CurriculumEntry,
} from '../api/courses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  created: 'Created',
  taught: 'Taught',
}

const STATUS_CLASSES: Record<string, string> = {
  planned: 'text-zinc-500 border-zinc-200 bg-zinc-50',
  created: 'text-blue-700 border-blue-200 bg-blue-50',
  taught: 'text-green-700 border-green-200 bg-green-50',
}

const MODE_LABELS: Record<string, string> = {
  general: 'General Learning',
  'exam-prep': 'Exam Prep',
}

function CompetencyBadge({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 capitalize">
      {label}
    </span>
  )
}

function VocabBadge({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700">
      {label}
    </span>
  )
}

interface EditState {
  topic: string
  grammarFocus: string
  competencies: string
  lessonType: string
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ topic: '', grammarFocus: '', competencies: '', lessonType: '' })
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [expandedForCourseId, setExpandedForCourseId] = useState<string | undefined>(id)
  if (expandedForCourseId !== id) {
    setExpandedForCourseId(id)
    setExpandedIds(new Set())
  }

  const { data: course, isLoading, isError } = useQuery({
    queryKey: ['course', id],
    queryFn: () => getCourse(id!),
    enabled: !!id,
  })

  const { mutate: doReorder } = useMutation({
    mutationFn: (orderedIds: string[]) => reorderCurriculum(id!, orderedIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course', id] }),
  })

  const { mutate: doUpdateEntry, isPending: updatingEntry } = useMutation({
    mutationFn: ({ entryId, req }: { entryId: string; req: { topic: string; grammarFocus?: string; competencies?: string; lessonType?: string } }) =>
      updateCurriculumEntry(id!, entryId, req),
    onSuccess: (_data, { entryId }) => {
      queryClient.invalidateQueries({ queryKey: ['course', id] })
      setEditingId(current => (current === entryId ? null : current))
    },
  })

  const { mutate: doMarkTaught } = useMutation({
    mutationFn: (entry: CurriculumEntry) => markEntryAsTaught(id!, entry.id, entry),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course', id] }),
  })

  const { mutate: doGenerateLesson, isPending: generatingLesson } = useMutation({
    mutationFn: (entryId: string) => generateLessonFromEntry(id!, entryId),
    onSuccess: ({ lessonId }) => {
      queryClient.invalidateQueries({ queryKey: ['course', id] })
      navigate(`/lessons/${lessonId}`)
    },
    onSettled: () => setGeneratingId(null),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (isError || !course) {
    return <div className="text-red-500 text-sm">Failed to load course.</div>
  }

  const entries = [...course.entries].sort((a, b) => a.orderIndex - b.orderIndex)
  const progress = `${course.lessonsCreated} of ${course.sessionCount} lessons created`

  function moveEntry(entry: CurriculumEntry, direction: 'up' | 'down') {
    const sorted = [...entries]
    const idx = sorted.findIndex(e => e.id === entry.id)
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= sorted.length) return
    ;[sorted[idx], sorted[newIdx]] = [sorted[newIdx], sorted[idx]]
    doReorder(sorted.map(e => e.id))
  }

  function startEdit(entry: CurriculumEntry) {
    setEditingId(entry.id)
    setEditState({
      topic: entry.topic,
      grammarFocus: entry.grammarFocus ?? '',
      competencies: entry.competencies,
      lessonType: entry.lessonType ?? '',
    })
  }

  function saveEdit(entryId: string) {
    doUpdateEntry({
      entryId,
      req: {
        topic: editState.topic,
        grammarFocus: editState.grammarFocus || undefined,
        competencies: editState.competencies || undefined,
        lessonType: editState.lessonType || undefined,
      },
    })
  }

  function toggleExpand(entryId: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(entryId)) { next.delete(entryId) } else { next.add(entryId) }
      return next
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/courses"
        backLabel="Courses"
        title={course.name}
        titleTestId="course-title"
        subtitle={[
          MODE_LABELS[course.mode] ?? course.mode,
          course.targetCefrLevel ?? course.targetExam,
          course.language,
          course.studentName ? `For ${course.studentName}` : null,
        ].filter(Boolean).join(' · ')}
      />

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${course.sessionCount > 0 ? (course.lessonsCreated / course.sessionCount) * 100 : 0}%` }}
          />
        </div>
        <span className="text-sm text-zinc-500 shrink-0" data-testid="course-progress">{progress}</span>
      </div>

      {/* Curriculum list */}
      <div className="space-y-2" data-testid="curriculum-list">
        {entries.map((entry, idx) => {
          const isExpanded = expandedIds.has(entry.id)
          const vocabList = entry.vocabularyThemes ? entry.vocabularyThemes.split(',').map(v => v.trim()).filter(Boolean) : []
          const competencyList = entry.competencies.split(',').map(c => c.trim()).filter(Boolean)

          return (
            <div
              key={entry.id}
              data-testid={`curriculum-entry-${idx}`}
              className="rounded-lg border border-zinc-200 bg-white"
            >
              {editingId === entry.id ? (
                <div className="p-4 space-y-3">
                  <Input
                    data-testid="edit-topic"
                    value={editState.topic}
                    onChange={e => setEditState(s => ({ ...s, topic: e.target.value }))}
                    placeholder="Topic"
                  />
                  <Input
                    data-testid="edit-grammar"
                    value={editState.grammarFocus}
                    onChange={e => setEditState(s => ({ ...s, grammarFocus: e.target.value }))}
                    placeholder="Grammar focus (optional)"
                  />
                  <Input
                    data-testid="edit-competencies"
                    value={editState.competencies}
                    onChange={e => setEditState(s => ({ ...s, competencies: e.target.value }))}
                    placeholder="Competencies (e.g. reading,speaking)"
                  />
                  <Input
                    data-testid="edit-lesson-type"
                    value={editState.lessonType}
                    onChange={e => setEditState(s => ({ ...s, lessonType: e.target.value }))}
                    placeholder="Lesson type (optional)"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      data-testid="save-entry-btn"
                      onClick={() => saveEdit(entry.id)}
                      disabled={updatingEntry || !editState.topic.trim()}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Collapsed header row */}
                  <div className="flex items-start gap-3 p-4">
                    {/* Order number + reorder */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        data-testid={`move-up-${idx}`}
                        onClick={() => moveEntry(entry, 'up')}
                        disabled={idx === 0}
                        className="p-2 rounded text-zinc-400 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <span className="text-xs font-mono text-zinc-400 w-5 text-center">{entry.orderIndex}</span>
                      <button
                        type="button"
                        data-testid={`move-down-${idx}`}
                        onClick={() => moveEntry(entry, 'down')}
                        disabled={idx === entries.length - 1}
                        className="p-2 rounded text-zinc-400 hover:text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Content summary */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-zinc-900">{entry.topic}</span>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', STATUS_CLASSES[entry.status] ?? STATUS_CLASSES.planned)}
                        >
                          {STATUS_LABELS[entry.status] ?? entry.status}
                        </Badge>
                      </div>
                      {entry.grammarFocus && (
                        <p className="text-xs text-zinc-500">Grammar: {entry.grammarFocus}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-1 shrink-0">
                      <button
                        type="button"
                        data-testid={`expand-entry-${idx}`}
                        onClick={() => toggleExpand(entry.id)}
                        className="p-2.5 rounded-md text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
                        aria-label={isExpanded ? 'Collapse entry' : 'Expand entry'}
                        aria-expanded={isExpanded}
                      >
                        <ChevronRight className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} />
                      </button>
                      <button
                        type="button"
                        data-testid={`edit-entry-${idx}`}
                        onClick={() => startEdit(entry)}
                        className="p-2.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                        aria-label="Edit entry"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {entry.status === 'created' && (
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`mark-taught-${idx}`}
                          onClick={() => doMarkTaught(entry)}
                          className="text-xs h-9 min-w-[44px] text-green-700 border-green-200 hover:bg-green-50"
                        >
                          <Check className="h-3.5 w-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Mark as taught</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`generate-lesson-${idx}`}
                        disabled={generatingLesson || entry.status !== 'planned'}
                        onClick={() => {
                          setGeneratingId(entry.id)
                          doGenerateLesson(entry.id)
                        }}
                        className="text-xs h-9 min-w-[44px]"
                      >
                        {generatingId === entry.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <BookOpen className="h-3.5 w-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">
                              {entry.status === 'planned' ? 'Generate Lesson' : entry.status === 'created' ? 'Created' : 'Taught'}
                            </span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div
                      data-testid={`entry-details-${idx}`}
                      className="px-4 pb-4 border-t border-zinc-100 pt-3 space-y-3"
                    >
                      {/* Communicative skills */}
                      {(competencyList.length > 0 || entry.lessonType) && (
                        <div>
                          <p className="text-xs font-medium text-zinc-500 mb-1">Skills</p>
                          <div className="flex flex-wrap gap-1">
                            {competencyList.map(c => (
                              <CompetencyBadge key={c} label={c} />
                            ))}
                            {entry.lessonType && (
                              <span className="inline-block rounded-full bg-zinc-50 border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500">
                                {entry.lessonType}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Vocabulary themes */}
                      {vocabList.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-zinc-500 mb-1">Vocabulary themes</p>
                          <div className="flex flex-wrap gap-1">
                            {vocabList.map(v => (
                              <VocabBadge key={v} label={v} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Personalized context */}
                      {entry.contextDescription && (
                        <div>
                          <p className="text-xs font-medium text-zinc-500 mb-1">Personalized context</p>
                          <p
                            data-testid={`context-description-${idx}`}
                            className="text-sm text-zinc-700 bg-blue-50 border border-blue-100 rounded-md px-3 py-2"
                          >
                            {entry.contextDescription}
                          </p>
                        </div>
                      )}

                      {/* Personalization rationale */}
                      {entry.personalizationNotes && (
                        <div>
                          <p className="text-xs font-medium text-zinc-500 mb-1">Personalization rationale</p>
                          <p
                            data-testid={`personalization-notes-${idx}`}
                            className="text-xs text-zinc-500 italic"
                          >
                            {entry.personalizationNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
