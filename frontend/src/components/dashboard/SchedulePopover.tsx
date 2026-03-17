import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ArrowLeft, Loader2 } from 'lucide-react'
import { updateLesson, type Lesson } from '../../api/lessons'
import type { Student } from '../../api/students'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface SchedulePopoverProps {
  date: Date
  students: Student[]
  unscheduledDrafts: Lesson[]
}

export function SchedulePopover({ date, students, unscheduledDrafts }: SchedulePopoverProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState<string | undefined>()
  const [time, setTime] = useState('10:00')
  const [view, setView] = useState<'main' | 'drafts'>('main')
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resetState = () => {
    setStudentId(undefined)
    setTime('10:00')
    setView('main')
    setAssigningId(null)
    setError(null)
  }

  const buildScheduledAt = () => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}T${time}`
  }

  const { mutate: doAssign } = useMutation({
    mutationFn: (draft: Lesson) =>
      updateLesson(draft.id, {
        title: draft.title,
        language: draft.language,
        cefrLevel: draft.cefrLevel,
        topic: draft.topic,
        scheduledAt: buildScheduledAt(),
        studentId: studentId ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      setOpen(false)
    },
    onError: () => {
      setError('Failed to assign draft. Please try again.')
      setAssigningId(null)
    },
  })

  const handleCreateNew = () => {
    const scheduledAt = buildScheduledAt()
    const params = new URLSearchParams()
    if (studentId) params.set('studentId', studentId)
    params.set('scheduledAt', scheduledAt)
    navigate(`/lessons/new?${params.toString()}`)
  }

  const handleAssignDraft = (draft: Lesson) => {
    setAssigningId(draft.id)
    setError(null)
    doAssign(draft)
  }

  const filteredDrafts = studentId
    ? unscheduledDrafts.filter(d => d.studentId === studentId || d.studentId === null)
    : unscheduledDrafts

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState() }}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded-full"
            aria-label="Schedule lesson"
            data-testid="schedule-popover-trigger"
          >
            <Plus className="h-3 w-3" />
          </Button>
        }
      />
      <PopoverContent align="start" side="bottom" className="w-72">
        {view === 'main' ? (
          <div className="space-y-3" data-testid="schedule-popover-main">
            <p className="text-sm font-medium text-zinc-900">Schedule Lesson</p>

            <div className="space-y-1.5">
              <Label className="text-xs">Student</Label>
              <Select value={studentId ?? 'none'} onValueChange={(v) => setStudentId(!v || v === 'none' ? undefined : v)}>
                <SelectTrigger data-testid="schedule-student-select" className="h-8 text-xs">
                  {studentId
                    ? <span>{students.find(s => s.id === studentId)?.name}</span>
                    : <SelectValue placeholder="Any student" />}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any student</SelectItem>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Time</Label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="schedule-time-input"
              />
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <Button
                size="sm"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                onClick={handleCreateNew}
                data-testid="schedule-create-new"
              >
                Create New Lesson
              </Button>
              {unscheduledDrafts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setView('drafts')}
                  data-testid="schedule-assign-draft"
                >
                  Assign Existing Draft
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2" data-testid="schedule-popover-drafts">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setView('main'); setError(null) }}
                className="p-0.5 rounded hover:bg-zinc-100"
                aria-label="Back"
                data-testid="schedule-drafts-back"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-zinc-500" />
              </button>
              <p className="text-sm font-medium text-zinc-900">Select Draft</p>
            </div>

            {error && (
              <p className="text-xs text-red-600" data-testid="schedule-error">{error}</p>
            )}

            {filteredDrafts.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2">No unscheduled drafts{studentId ? ' for this student' : ''}.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredDrafts.map(draft => (
                  <button
                    key={draft.id}
                    onClick={() => handleAssignDraft(draft)}
                    disabled={assigningId !== null}
                    className="w-full text-left rounded px-2 py-1.5 text-xs border border-zinc-200 hover:bg-zinc-50 transition-colors flex items-center justify-between"
                    data-testid={`schedule-draft-${draft.id}`}
                  >
                    <div className="truncate">
                      <div className="font-medium truncate">{draft.title}</div>
                      <div className="text-zinc-500">{draft.cefrLevel} {draft.language}</div>
                    </div>
                    {assigningId === draft.id && (
                      <Loader2 className="h-3 w-3 animate-spin text-zinc-400 ml-2 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
