import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { KeyboardSensor } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  BookOpen,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react'
import {
  getCourse,
  reorderCurriculum,
  updateCurriculumEntry,
  markEntryAsTaught,
  generateLessonFromEntry,
  addCurriculumEntry,
  deleteCurriculumEntry,
  dismissWarning,
  type CurriculumEntry,
  type CurriculumWarning,
} from '../api/courses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { logger } from '../lib/logger'

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

interface StatChipProps {
  label: string
  value: string
  testId?: string
}

function StatChip({ label, value, testId }: StatChipProps) {
  return (
    <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-zinc-50 border border-zinc-200 min-w-[80px]" data-testid={testId}>
      <span className="text-xs text-zinc-500 whitespace-nowrap">{label}</span>
      <span className="text-sm font-semibold text-zinc-800 whitespace-nowrap">{value}</span>
    </div>
  )
}

interface EditState {
  topic: string
  grammarFocus: string
  competencies: string
  lessonType: string
}

interface SortableEntryRowProps {
  entry: CurriculumEntry
  idx: number
  isExpanded: boolean
  isEditing: boolean
  editState: EditState
  updatingEntry: boolean
  generatingId: string | null
  generatingLesson: boolean
  onToggleExpand: (id: string) => void
  onStartEdit: (entry: CurriculumEntry) => void
  onCancelEdit: () => void
  onSaveEdit: (entryId: string) => void
  onEditStateChange: (field: keyof EditState, value: string) => void
  onMarkTaught: (entry: CurriculumEntry) => void
  onGenerateLesson: (entryId: string) => void
  onRequestDelete: (entryId: string) => void
}

function SortableEntryRow({
  entry,
  idx,
  isExpanded,
  isEditing,
  editState,
  updatingEntry,
  generatingId,
  generatingLesson,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditStateChange,
  onMarkTaught,
  onGenerateLesson,
  onRequestDelete,
}: SortableEntryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const vocabList = entry.vocabularyThemes ? entry.vocabularyThemes.split(',').map(v => v.trim()).filter(Boolean) : []
  const competencyList = entry.competencies.split(',').map(c => c.trim()).filter(Boolean)

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`curriculum-entry-${idx}`}
      className="rounded-lg border border-zinc-200 bg-white"
    >
      {isEditing ? (
        <div className="p-4 space-y-3">
          <Input
            data-testid="edit-topic"
            value={editState.topic}
            onChange={e => onEditStateChange('topic', e.target.value)}
            placeholder="Topic"
          />
          <Input
            data-testid="edit-grammar"
            value={editState.grammarFocus}
            onChange={e => onEditStateChange('grammarFocus', e.target.value)}
            placeholder="Grammar focus (optional)"
          />
          <Input
            data-testid="edit-competencies"
            value={editState.competencies}
            onChange={e => onEditStateChange('competencies', e.target.value)}
            placeholder="Competencies (e.g. reading,speaking)"
          />
          <Input
            data-testid="edit-lesson-type"
            value={editState.lessonType}
            onChange={e => onEditStateChange('lessonType', e.target.value)}
            placeholder="Lesson type (optional)"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              data-testid="save-entry-btn"
              onClick={() => onSaveEdit(entry.id)}
              disabled={updatingEntry || !editState.topic.trim()}
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelEdit}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 p-4">
            {/* Drag handle */}
            <button
              type="button"
              data-testid={`drag-handle-${idx}`}
              className="mt-1 p-1 rounded text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 cursor-grab active:cursor-grabbing shrink-0"
              aria-label="Drag to reorder"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>

            {/* Order number */}
            <span className="mt-1 text-xs font-mono text-zinc-400 w-5 text-center shrink-0">{entry.orderIndex}</span>

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
                onClick={() => onToggleExpand(entry.id)}
                className="p-2.5 rounded-md text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
                aria-label={isExpanded ? 'Collapse entry' : 'Expand entry'}
                aria-expanded={isExpanded}
              >
                <ChevronRight className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} />
              </button>
              <button
                type="button"
                data-testid={`edit-entry-${idx}`}
                onClick={() => onStartEdit(entry)}
                className="p-2.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                aria-label="Edit entry"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                data-testid={`delete-entry-${idx}`}
                onClick={() => onRequestDelete(entry.id)}
                className="p-2.5 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50"
                aria-label="Remove entry"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {entry.status === 'created' && (
                <Button
                  size="sm"
                  variant="outline"
                  data-testid={`mark-taught-${idx}`}
                  onClick={() => onMarkTaught(entry)}
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
                onClick={() => onGenerateLesson(entry.id)}
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
}

function GenerationWarningsPanel({
  warnings,
  dismissedKeys,
  onDismiss,
}: {
  warnings: CurriculumWarning[] | null | undefined
  dismissedKeys: string[] | null | undefined
  onDismiss: (key: string) => void
}) {
  if (!warnings || warnings.length === 0) return null

  const dismissed = new Set(dismissedKeys ?? [])
  const visibleWarnings = warnings.filter(
    w => !dismissed.has(`session:${w.sessionIndex}:${w.grammarFocus}`)
  )

  if (visibleWarnings.length === 0) {
    return (
      <div data-testid="warnings-panel-clear" className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
        <Check className="h-4 w-4 shrink-0" />
        All grammar structures are level-appropriate.
      </div>
    )
  }

  return (
    <div data-testid="warnings-panel" className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {visibleWarnings.length} out-of-level grammar {visibleWarnings.length === 1 ? 'structure' : 'structures'} detected
      </div>
      <ul className="space-y-2">
        {visibleWarnings.map(w => {
          const key = `session:${w.sessionIndex}:${w.grammarFocus}`
          return (
            <li key={key} className="flex items-start justify-between gap-3 text-sm">
              <div className="space-y-0.5">
                <span className="font-medium text-amber-900">Session {w.sessionIndex}: </span>
                <span className="text-amber-800">{w.grammarFocus}</span>
                {w.suggestedLevel && (
                  <span className="text-amber-600"> (expected {w.suggestedLevel})</span>
                )}
                <p className="text-amber-700 text-xs">{w.flagReason}</p>
              </div>
              <button
                data-testid={`dismiss-warning-${w.sessionIndex}`}
                onClick={() => onDismiss(key)}
                className="shrink-0 text-amber-600 hover:text-amber-800 text-xs underline"
                aria-label={`Dismiss warning for session ${w.sessionIndex}`}
              >
                Dismiss
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addState, setAddState] = useState({ topic: '', grammarFocus: '', competencies: '' })

  if (expandedForCourseId !== id) {
    setExpandedForCourseId(id)
    setExpandedIds(new Set())
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const { data: course, isLoading, isError } = useQuery({
    queryKey: ['course', id],
    queryFn: () => getCourse(id!),
    enabled: !!id,
  })

  const { mutate: doReorder } = useMutation({
    mutationFn: (orderedIds: string[]) => reorderCurriculum(id!, orderedIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course', id] }),
    onError: (err) => logger.error('CourseDetail', 'reorder failed', err),
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
    onError: (err) => logger.error('CourseDetail', 'mark taught failed', err),
  })

  const { mutate: doGenerateLesson, isPending: generatingLesson } = useMutation({
    mutationFn: (entryId: string) => generateLessonFromEntry(id!, entryId),
    onSuccess: ({ lessonId }) => {
      queryClient.invalidateQueries({ queryKey: ['course', id] })
      navigate(`/lessons/${lessonId}`)
    },
    onSettled: () => setGeneratingId(null),
  })

  const { mutate: doAddEntry, isPending: addingEntry } = useMutation({
    mutationFn: () => addCurriculumEntry(id!, {
      topic: addState.topic,
      grammarFocus: addState.grammarFocus || undefined,
      competencies: addState.competencies || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', id] })
      setShowAddForm(false)
      setAddState({ topic: '', grammarFocus: '', competencies: '' })
    },
    onError: (err) => logger.error('CourseDetail', 'add entry failed', err),
  })

  const { mutate: doDeleteEntry, isPending: deletingEntry } = useMutation({
    mutationFn: (entryId: string) => deleteCurriculumEntry(id!, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', id] })
      setConfirmDeleteId(null)
    },
    onError: (err) => logger.error('CourseDetail', 'delete entry failed', err),
  })

  const { mutate: doDismissWarning } = useMutation({
    mutationFn: (warningKey: string) => dismissWarning(id!, warningKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course', id] }),
    onError: (err) => logger.error('CourseDetail', 'dismiss warning failed', err),
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
    return (
      <div className="space-y-6">
        <PageHeader backTo="/courses" backLabel="Courses" title="Course" />
        <div className="flex flex-col items-center justify-center py-24 gap-4" data-testid="course-load-error">
          <p className="text-sm text-red-500">Failed to load course.</p>
          <Button
            variant="outline"
            data-testid="course-load-retry-btn"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['course', id] })}
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  const entries = [...course.entries].sort((a, b) => a.orderIndex - b.orderIndex)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = entries.findIndex(e => e.id === active.id)
    const newIndex = entries.findIndex(e => e.id === over.id)
    const reordered = arrayMove(entries, oldIndex, newIndex)
    doReorder(reordered.map(e => e.id))
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

  const progressPercent = course.sessionCount > 0
    ? (course.lessonsCreated / course.sessionCount) * 100
    : 0

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/courses"
        backLabel="Courses"
        title={course.name}
        titleTestId="course-title"
      />

      {/* Curriculum summary header */}
      <div data-testid="course-summary-header" className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <StatChip label="Sessions" value={String(course.sessionCount)} testId="summary-sessions" />
          {(course.targetCefrLevel || course.targetExam) && (
            <StatChip
              label="Level"
              value={course.targetCefrLevel ?? course.targetExam ?? ''}
              testId="summary-level"
            />
          )}
          {course.studentName && (
            <StatChip label="Student" value={course.studentName} testId="summary-student" />
          )}
          <StatChip
            label="Mode"
            value={MODE_LABELS[course.mode] ?? course.mode}
            testId="summary-mode"
          />
          <StatChip
            label="Progress"
            value={`${course.lessonsCreated}/${course.sessionCount}`}
            testId="summary-progress"
          />
        </div>
        {/* Progress bar on its own row so it always has full width */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-zinc-200 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm text-zinc-500 shrink-0 whitespace-nowrap" data-testid="course-progress">
            {course.lessonsCreated} of {course.sessionCount} lessons created
          </span>
        </div>
      </div>

      {/* Generation quality warnings */}
      <GenerationWarningsPanel
        warnings={course.warnings}
        dismissedKeys={course.dismissedWarningKeys}
        onDismiss={doDismissWarning}
      />

      {/* Curriculum list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2" data-testid="curriculum-list">
            {entries.map((entry, idx) => (
              <SortableEntryRow
                key={entry.id}
                entry={entry}
                idx={idx}
                isExpanded={expandedIds.has(entry.id)}
                isEditing={editingId === entry.id}
                editState={editState}
                updatingEntry={updatingEntry}
                generatingId={generatingId}
                generatingLesson={generatingLesson}
                onToggleExpand={toggleExpand}
                onStartEdit={startEdit}
                onCancelEdit={() => setEditingId(null)}
                onSaveEdit={saveEdit}
                onEditStateChange={(field, value) => setEditState(s => ({ ...s, [field]: value }))}
                onMarkTaught={doMarkTaught}
                onGenerateLesson={(entryId) => {
                  setGeneratingId(entryId)
                  doGenerateLesson(entryId)
                }}
                onRequestDelete={(id) => setConfirmDeleteId(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add session */}
      {showAddForm ? (
        <div data-testid="add-entry-form" className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
          <p className="text-sm font-medium text-zinc-700">New session</p>
          <Input
            data-testid="add-topic"
            value={addState.topic}
            onChange={e => setAddState(s => ({ ...s, topic: e.target.value }))}
            placeholder="Topic (required)"
          />
          <Input
            data-testid="add-grammar"
            value={addState.grammarFocus}
            onChange={e => setAddState(s => ({ ...s, grammarFocus: e.target.value }))}
            placeholder="Grammar focus (optional)"
          />
          <Input
            data-testid="add-competencies"
            value={addState.competencies}
            onChange={e => setAddState(s => ({ ...s, competencies: e.target.value }))}
            placeholder="Competencies (e.g. reading,speaking)"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              data-testid="save-add-entry-btn"
              onClick={() => doAddEntry()}
              disabled={addingEntry || !addState.topic.trim()}
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Add session
            </Button>
            <Button
              size="sm"
              variant="ghost"
              data-testid="cancel-add-entry-btn"
              onClick={() => {
                setShowAddForm(false)
                setAddState({ topic: '', grammarFocus: '', competencies: '' })
              }}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          data-testid="add-entry-btn"
          onClick={() => setShowAddForm(true)}
          className="w-full border-dashed text-zinc-500 hover:text-zinc-700"
        >
          <Plus className="h-4 w-4 mr-1" /> Add session
        </Button>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={confirmDeleteId !== null} onOpenChange={open => { if (!open) setConfirmDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove session?</AlertDialogTitle>
            <AlertDialogDescription>
              This session will be removed from the curriculum. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="confirm-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-ok"
              onClick={() => confirmDeleteId && doDeleteEntry(confirmDeleteId)}
              disabled={deletingEntry}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
