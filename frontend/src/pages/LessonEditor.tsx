import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Copy, Trash2, UserPlus, CheckCircle, Sparkles, Square, CalendarPlus, Plus, Pencil } from 'lucide-react'
import {
  getLesson, updateLesson, updateSections, deleteLesson, duplicateLesson,
  type Lesson, type LessonStatus, type SectionType,
} from '../api/lessons'
import { getStudents } from '../api/students'
import {
  getContentBlocks,
  type ContentBlockDto,
} from '../api/generate'
import type { ContentBlockType } from '../types/contentTypes'
import { logger } from '../lib/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { GeneratePanel } from '@/components/lesson/GeneratePanel'
import { ContentBlock } from '@/components/lesson/ContentBlock'
import { ExportButton } from '@/components/lesson/ExportButton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { getCefrBadgeClasses } from '@/lib/cefr-colors'
import { FullLessonGenerateButton } from '@/components/lesson/FullLessonGenerateButton'
import { LessonNotesCard } from '@/components/lesson/LessonNotesCard'
import { Skeleton } from '@/components/ui/skeleton'

const SECTION_ORDER: SectionType[] = ['WarmUp', 'Presentation', 'Practice', 'Production', 'WrapUp']
const SECTION_LABELS: Record<SectionType, string> = {
  WarmUp: 'Warm Up',
  Presentation: 'Presentation',
  Practice: 'Practice',
  Production: 'Production',
  WrapUp: 'Wrap Up',
}
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Other']
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const DURATIONS = [30, 45, 60, 90]

function initSectionNotes(lesson: Lesson): Partial<Record<SectionType, string>> {
  const notes: Partial<Record<SectionType, string>> = {}
  for (const s of lesson.sections) {
    notes[s.sectionType as SectionType] = s.notes ?? ''
  }
  return notes
}

export default function LessonEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [schedulingInline, setSchedulingInline] = useState(false)
  const [inlineScheduleDate, setInlineScheduleDate] = useState('')
  const [linkStudentOpen, setLinkStudentOpen] = useState(false)
  const [linkStudentId, setLinkStudentId] = useState<string>('')

  // Inline title editing
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  // Section notes local state
  const [sectionNotes, setSectionNotes] = useState<Partial<Record<SectionType, string>> | null>(null)
  const [confirmRemoveSection, setConfirmRemoveSection] = useState<SectionType | null>(null)
  const [hasSavedOnce, setHasSavedOnce] = useState(false)

  // Reset save indicator when navigating to a different lesson
  useEffect(() => {
    setHasSavedOnce(false)
  }, [id])

  // Metadata edit state
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaDraft, setMetaDraft] = useState({ language: '', cefrLevel: '', topic: '', durationMinutes: 60, objectives: '', scheduledAt: '' })

  // AI content blocks: keyed by sectionId
  const [contentBlocks, setContentBlocks] = useState<Record<string, ContentBlockDto[]>>({})
  // Which section has the generate panel open (by SectionType)
  const [generateOpen, setGenerateOpen] = useState<SectionType | null>(null)
  // Whether the open panel is actively streaming
  const [isGenerating, setIsGenerating] = useState(false)
  // When regenerating: which block is being replaced
  const [regenerateParams, setRegenerateParams] = useState<{ sectionType: SectionType; blockType: ContentBlockType; style?: string; direction?: string } | null>(null)

  const closeGeneratePanel = useCallback(() => {
    setGenerateOpen(null)
    setRegenerateParams(null)
    setIsGenerating(false)
  }, [])

  const { data: lesson, isLoading, isError } = useQuery({
    queryKey: ['lesson', id],
    queryFn: () => getLesson(id!),
    enabled: !!id,
  })

  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents(),
  })

  // Initialise local state from fetched lesson (sync server data to form)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (lesson) {
      setSectionNotes(initSectionNotes(lesson))
      setTitleDraft(lesson.title)
      setMetaDraft({
        language: lesson.language,
        cefrLevel: lesson.cefrLevel,
        topic: lesson.topic,
        durationMinutes: lesson.durationMinutes,
        objectives: lesson.objectives ?? '',
        scheduledAt: lesson.scheduledAt ? lesson.scheduledAt.slice(0, 16) : '',
      })
    }
  }, [lesson])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Load content blocks once lesson id is available; cleanup ignores stale responses
  useEffect(() => {
    if (!id) return
    let cancelled = false
    getContentBlocks(id).then((blocks) => {
      if (cancelled) return
      const grouped: Record<string, ContentBlockDto[]> = {}
      for (const b of blocks) {
        if (!b.lessonSectionId) continue
        if (!grouped[b.lessonSectionId]) grouped[b.lessonSectionId] = []
        grouped[b.lessonSectionId].push(b)
      }
      setContentBlocks(grouped)
    }).catch((err) => {
      if (cancelled) return
      logger.warn('LessonEditor', 'failed to load content blocks', { id, err })
    })
    return () => { cancelled = true }
  }, [id])

  const { mutate: doUpdate, isPending: isUpdating } = useMutation({
    mutationFn: (data: Parameters<typeof updateLesson>[1]) => updateLesson(id!, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['lesson', id], updated)
      setHasSavedOnce(true)
    },
  })

  const { mutate: doUpdateSections, isPending: isSaving } = useMutation({
    mutationFn: (payload: { sectionType: SectionType; orderIndex: number; notes: string | null }[]) =>
      updateSections(id!, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['lesson', id], updated)
      logger.info('LessonEditor', 'sections saved', { id })
      setHasSavedOnce(true)
    },
  })

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteLesson(id!),
    onSuccess: () => {
      logger.info('LessonEditor', 'lesson deleted', { id })
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      navigate('/lessons')
    },
  })

  const { mutate: doDuplicate, isPending: isDuplicating } = useMutation({
    mutationFn: () => duplicateLesson(id!),
    onSuccess: (copy) => {
      logger.info('LessonEditor', 'lesson duplicated', { original: id, copy: copy.id })
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      navigate(`/lessons/${copy.id}`)
    },
  })

  const handleTitleBlur = useCallback(() => {
    setEditingTitle(false)
    if (lesson && titleDraft.trim() && titleDraft !== lesson.title) {
      doUpdate({
        title: titleDraft,
        language: lesson.language,
        cefrLevel: lesson.cefrLevel,
        topic: lesson.topic,
        durationMinutes: lesson.durationMinutes,
        objectives: lesson.objectives,
        status: lesson.status,
        studentId: lesson.studentId,
        scheduledAt: lesson.scheduledAt ?? null,
      })
    }
  }, [lesson, titleDraft, doUpdate])

  const handleStatusToggle = useCallback(() => {
    if (!lesson) return
    const next: LessonStatus = lesson.status === 'Draft' ? 'Published' : 'Draft'
    logger.info('LessonEditor', 'status changed', { id, status: next })
    doUpdate({
      title: lesson.title,
      language: lesson.language,
      cefrLevel: lesson.cefrLevel,
      topic: lesson.topic,
      durationMinutes: lesson.durationMinutes,
      objectives: lesson.objectives,
      status: next,
      studentId: lesson.studentId,
      scheduledAt: lesson.scheduledAt ?? null,
    })
  }, [lesson, doUpdate, id])

  const handleSectionBlur = useCallback((type: SectionType, value: string) => {
    if (!sectionNotes || !lesson) return
    const updated = { ...sectionNotes, [type]: value }
    setSectionNotes(updated)
    if (isSaving) {
      logger.warn('LessonEditor', 'concurrent save detected, previous save still in-flight', { id })
    }
    const payload = lesson.sections
      .map(s => ({
        sectionType: s.sectionType as SectionType,
        orderIndex: s.orderIndex,
        notes: (s.sectionType === type ? value : updated[s.sectionType as SectionType]) || null,
      }))
    doUpdateSections(payload)
  }, [sectionNotes, lesson, doUpdateSections, isSaving, id])

  const handleMetaSave = useCallback(() => {
    if (!lesson) return
    doUpdate({
      title: lesson.title,
      language: metaDraft.language,
      cefrLevel: metaDraft.cefrLevel,
      topic: metaDraft.topic,
      durationMinutes: metaDraft.durationMinutes,
      objectives: metaDraft.objectives || null,
      status: lesson.status,
      studentId: lesson.studentId,
      scheduledAt: metaDraft.scheduledAt || null,
    })
    setEditingMeta(false)
  }, [lesson, metaDraft, doUpdate])

  const handleLinkStudent = useCallback(() => {
    if (!lesson || !linkStudentId) return
    doUpdate({
      title: lesson.title,
      language: lesson.language,
      cefrLevel: lesson.cefrLevel,
      topic: lesson.topic,
      durationMinutes: lesson.durationMinutes,
      objectives: lesson.objectives,
      status: lesson.status,
      studentId: linkStudentId,
      scheduledAt: lesson.scheduledAt ?? null,
    })
    setLinkStudentOpen(false)
  }, [lesson, linkStudentId, doUpdate])

  const handleQuickSchedule = useCallback(() => {
    if (!lesson || !inlineScheduleDate) return
    doUpdate({
      title: lesson.title,
      language: lesson.language,
      cefrLevel: lesson.cefrLevel,
      topic: lesson.topic,
      durationMinutes: lesson.durationMinutes,
      objectives: lesson.objectives,
      status: lesson.status,
      studentId: lesson.studentId,
      scheduledAt: inlineScheduleDate,
    })
    setSchedulingInline(false)
    setInlineScheduleDate('')
  }, [lesson, inlineScheduleDate, doUpdate])

  const handleBlockInsert = useCallback((block: ContentBlockDto) => {
    if (!block.lessonSectionId) return
    setContentBlocks(prev => {
      const existing = prev[block.lessonSectionId!] ?? []
      return { ...prev, [block.lessonSectionId!]: [...existing, block] }
    })
  }, [])

  const handleBlockUpdate = useCallback((updated: ContentBlockDto) => {
    if (!updated.lessonSectionId) return
    setContentBlocks(prev => {
      const existing = prev[updated.lessonSectionId!] ?? []
      return {
        ...prev,
        [updated.lessonSectionId!]: existing.map(b => b.id === updated.id ? updated : b),
      }
    })
  }, [])

  const handleBlockDelete = useCallback((id: string, sectionId: string) => {
    setContentBlocks(prev => {
      const existing = prev[sectionId] ?? []
      return { ...prev, [sectionId]: existing.filter(b => b.id !== id) }
    })
  }, [])

  const handleAddSection = useCallback((type: SectionType) => {
    if (!lesson || !sectionNotes) return
    const existingTypes = lesson.sections.map(s => s.sectionType as SectionType)
    const allTypes = [...existingTypes, type]
    const sorted = SECTION_ORDER.filter(t => allTypes.includes(t))
    const payload = sorted.map((t, idx) => ({
      sectionType: t,
      orderIndex: idx,
      notes: (sectionNotes[t] ?? '') || null,
    }))
    doUpdateSections(payload)
  }, [lesson, sectionNotes, doUpdateSections])

  const handleRemoveSection = useCallback((type: SectionType) => {
    if (!lesson || !sectionNotes) return
    const remaining = lesson.sections
      .filter(s => s.sectionType !== type)
      .map(s => s.sectionType as SectionType)
    const sorted = SECTION_ORDER.filter(t => remaining.includes(t))
    const payload = sorted.map((t, idx) => ({
      sectionType: t,
      orderIndex: idx,
      notes: (sectionNotes[t] ?? '') || null,
    }))
    setConfirmRemoveSection(null)
    doUpdateSections(payload, {
      onSuccess: () => {
        setSectionNotes(prev => {
          if (!prev) return prev
          const next = { ...prev }
          delete next[type]
          return next
        })
        if (generateOpen === type) closeGeneratePanel()
      },
    })
  }, [lesson, sectionNotes, doUpdateSections, generateOpen, closeGeneratePanel])

  const students = studentsData?.items ?? []

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Card className="bg-white border border-zinc-200">
          <CardHeader className="py-3 px-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardHeader>
        </Card>
        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-white border border-zinc-200">
              <CardHeader className="py-3 px-6"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent className="px-6 pb-4"><Skeleton className="h-24 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  if (isError || !lesson) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-red-600 font-medium">Lesson not found. <button onClick={() => navigate('/lessons')} className="underline">Go back</button></span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back link */}
      <Link
        to="/lessons"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
        data-testid="page-header-back"
      >
        <ArrowLeft className="h-4 w-4" />
        Lessons
      </Link>

      {/* Top bar */}
      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
        {editingTitle ? (
          <Input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
            className="text-xl font-semibold flex-1 min-w-0"
            data-testid="title-input"
          />
        ) : (
          <h1
            className="text-2xl font-bold text-zinc-900 flex-1 cursor-pointer hover:text-indigo-700 transition-colors"
            onClick={() => setEditingTitle(true)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEditingTitle(true)}
            role="button"
            tabIndex={0}
            data-testid="lesson-title"
          >
            {lesson.title}
          </h1>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleStatusToggle}
            data-testid="status-toggle"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              lesson.status === 'Published'
                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            {lesson.status}
          </button>

          <Tooltip>
            <TooltipTrigger render={<span />}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => doDuplicate()}
                disabled={isDuplicating}
                aria-label="Duplicate lesson"
                data-testid="duplicate-btn"
              >
                <Copy className="h-4 w-4 text-zinc-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger render={<span />}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete lesson"
                data-testid="delete-btn"
              >
                <Trash2 className="h-4 w-4 text-zinc-500" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>

          <ExportButton lessonId={id!} />

          <FullLessonGenerateButton
            lessonId={id!}
            sections={lesson.sections}
            lessonContext={{
              language: lesson.language,
              cefrLevel: lesson.cefrLevel,
              topic: lesson.topic,
              studentId: lesson.studentId ?? undefined,
            }}
            onBlockSaved={handleBlockInsert}
          />

          <button
            onClick={() => { if (!isSaving && !isUpdating) navigate(`/lessons/${id}/study`) }}
            disabled={isSaving || isUpdating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="preview-student-btn"
          >
            <span className="hidden sm:inline">Preview as Student</span>
            <span className="sm:hidden">Preview</span>
          </button>

          {(isSaving || isUpdating) && (
            <span className="text-xs text-zinc-400 flex items-center gap-1 animate-pulse" data-testid="saved-indicator">
              Saving...
            </span>
          )}
          {hasSavedOnce && !isSaving && !isUpdating && (
            <span className="text-xs text-green-600 flex items-center gap-1" data-testid="saved-indicator">
              <CheckCircle className="h-3 w-3" /> All changes saved
            </span>
          )}
        </div>
      </div>

      {/* Context bar */}
      <div className="flex items-center gap-3 flex-wrap rounded-lg border border-zinc-200 bg-white px-4 py-2.5">
        {/* Student slot */}
        {lesson.studentName ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <UserPlus className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-medium text-indigo-700" data-testid="editor-student-name">
              {lesson.studentName}
            </span>
          </div>
        ) : students.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLinkStudentOpen(true)}
            className="h-7 px-2 text-xs text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50"
            data-testid="link-student-btn"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Link student
          </Button>
        ) : null}

        {(lesson.studentName || students.length > 0) && (
          <span className="h-4 w-px bg-zinc-200 shrink-0" aria-hidden="true" />
        )}

        {/* Schedule slot */}
        {schedulingInline ? (
          <div className="flex flex-wrap items-center gap-2">
            <DateTimePicker
              value={inlineScheduleDate}
              onChange={setInlineScheduleDate}
              autoFocus
              className="flex-1 min-w-0"
              data-testid="inline-schedule-input"
            />
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" onClick={handleQuickSchedule} disabled={!inlineScheduleDate} className="bg-indigo-600 hover:bg-indigo-700 text-white">Save</Button>
              <Button variant="ghost" size="sm" onClick={() => { setSchedulingInline(false); setInlineScheduleDate('') }}>Cancel</Button>
            </div>
          </div>
        ) : lesson.scheduledAt ? (
          <button
            onClick={() => { setSchedulingInline(true); setInlineScheduleDate(lesson.scheduledAt!.slice(0, 16)) }}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors shrink-0"
            data-testid="quick-schedule-btn"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            {new Date(lesson.scheduledAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSchedulingInline(true)}
            className="h-7 px-2 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 shrink-0"
            data-testid="quick-schedule-btn"
          >
            <CalendarPlus className="h-3.5 w-3.5 mr-1" />
            Schedule
          </Button>
        )}

        {/* Secondary metadata */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <Badge variant="outline" className={`text-xs ${getCefrBadgeClasses(lesson.cefrLevel)}`}>{lesson.cefrLevel}</Badge>
          <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-200">{lesson.language}</Badge>
          <span className="text-xs text-zinc-500">{lesson.topic}</span>
          <span className="text-xs text-zinc-400">{lesson.durationMinutes} min</span>
          <Tooltip>
            <TooltipTrigger render={<span />}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400 hover:text-zinc-700"
                onClick={() => setEditingMeta(true)}
                aria-label="Edit lesson details"
                data-testid="edit-details-btn"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit details</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Edit details form */}
      {editingMeta && (
        <Card className="bg-white border border-zinc-200">
          <CardContent className="px-6 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={metaDraft.language} onValueChange={(v) => setMetaDraft(d => ({ ...d, language: v ?? d.language }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CEFR Level</Label>
                  <Select value={metaDraft.cefrLevel} onValueChange={(v) => setMetaDraft(d => ({ ...d, cefrLevel: v ?? d.cefrLevel }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CEFR_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Topic</Label>
                <Input value={metaDraft.topic} onChange={(e) => setMetaDraft(d => ({ ...d, topic: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={String(metaDraft.durationMinutes)} onValueChange={(v) => setMetaDraft(d => ({ ...d, durationMinutes: v ? parseInt(v) : d.durationMinutes }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DURATIONS.map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scheduled Date & Time</Label>
                <DateTimePicker
                  value={metaDraft.scheduledAt}
                  onChange={(v) => setMetaDraft(d => ({ ...d, scheduledAt: v }))}
                  data-testid="input-scheduled-at"
                />
              </div>
              <div className="space-y-2">
                <Label>Objectives</Label>
                <Textarea value={metaDraft.objectives} onChange={(e) => setMetaDraft(d => ({ ...d, objectives: e.target.value }))} rows={3} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditingMeta(false)}>Cancel</Button>
                <Button size="sm" onClick={handleMetaSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section panels */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-zinc-700">Lesson Sections</h2>

        {sectionNotes && [...lesson.sections].sort((a, b) => a.orderIndex - b.orderIndex).map((section) => {
          const type = section.sectionType as SectionType
          const sectionId = section.id
          const blocks = contentBlocks[sectionId] ?? []
          const isGenerateOpen = generateOpen === type
          const canRemove = lesson.sections.length > 1

          return (
            <Card key={type} className="bg-white border border-zinc-200" data-testid={`section-card-${type.toLowerCase()}`}>
              <CardHeader className="py-3 px-6 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-zinc-700">{SECTION_LABELS[type]}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (isGenerateOpen) {
                          // Closing the panel unmounts GeneratePanel, which triggers abort cleanup in useGenerate.
                          closeGeneratePanel()
                        } else {
                          setRegenerateParams(null)
                          setGenerateOpen(type)
                        }
                      }}
                      disabled={!isGenerateOpen && isGenerating}
                      className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={!isGenerateOpen && isGenerating ? 'Generation in progress' : undefined}
                      data-testid={`generate-btn-${type.toLowerCase()}`}
                    >
                      {isGenerateOpen && isGenerating ? (
                        <>
                          <Square className="h-3 w-3 mr-1" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Generate
                        </>
                      )}
                    </Button>
                    <Tooltip>
                      <TooltipTrigger render={<span />}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-400 hover:text-red-600"
                          disabled={!canRemove}
                          onClick={() => setConfirmRemoveSection(type)}
                          data-testid={`remove-section-${type.toLowerCase()}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{canRemove ? 'Remove section' : 'Cannot remove last section'}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-4 space-y-3">
                <Textarea
                  value={sectionNotes[type] ?? ''}
                  onChange={(e) => setSectionNotes(n => n ? { ...n, [type]: e.target.value } : n)}
                  onBlur={(e) => handleSectionBlur(type, e.target.value)}
                  placeholder={`Add notes for ${SECTION_LABELS[type]}...`}
                  rows={4}
                  className="resize-none text-sm"
                  data-testid={`section-${type.toLowerCase()}`}
                />

                {!sectionNotes[type] && blocks.length === 0 && (
                  <p className="text-xs text-zinc-400 italic">Use Generate to create content, or type your notes above.</p>
                )}

                {blocks.map(block => (
                  <ContentBlock
                    key={block.id}
                    block={block}
                    lessonId={id!}
                    onUpdate={handleBlockUpdate}
                    onDelete={(blockId) => handleBlockDelete(blockId, sectionId)}
                    onRegenerate={(blockType, params, direction) => {
                      let style: string | undefined
                      if (params) {
                        try { style = (JSON.parse(params) as { style?: string }).style } catch { /* ignore */ }
                      }
                      setRegenerateParams({ sectionType: type, blockType: blockType as ContentBlockType, style, direction })
                      setGenerateOpen(type)
                    }}
                  />
                ))}

                {isGenerateOpen && (
                  <GeneratePanel
                    lessonId={id!}
                    sectionId={sectionId}
                    sectionType={type}
                    initialTaskType={regenerateParams?.sectionType === type ? regenerateParams.blockType : undefined}
                    initialStyle={regenerateParams?.sectionType === type ? regenerateParams.style : undefined}
                    initialDirection={regenerateParams?.sectionType === type ? regenerateParams.direction : undefined}
                    lessonContext={{
                      language: lesson.language,
                      cefrLevel: lesson.cefrLevel,
                      topic: lesson.topic,
                      studentId: lesson.studentId,
                      existingNotes: sectionNotes[type] || null,
                    }}
                    onStreamingChange={setIsGenerating}
                    onInsert={(block) => {
                      handleBlockInsert(block)
                      setRegenerateParams(null)
                    }}
                    onClose={closeGeneratePanel}
                  />
                )}
              </CardContent>
            </Card>
          )
        })}

        {/* Add Section dropdown */}
        {(() => {
          const existingTypes = new Set(lesson.sections.map(s => s.sectionType))
          const missingTypes = SECTION_ORDER.filter(t => !existingTypes.has(t))
          if (missingTypes.length === 0) return null
          return (
            <div data-testid="add-section-container">
              <Select onValueChange={(v) => handleAddSection(v as SectionType)}>
                <SelectTrigger className="w-48" data-testid="add-section-select">
                  <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                    <Plus className="h-4 w-4" />
                    <span>Add Section</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {missingTypes.map(type => (
                    <SelectItem key={type} value={type} data-testid={`add-section-${type.toLowerCase()}`}>
                      {SECTION_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })()}
      </div>

      {/* Lesson Notes */}
      <LessonNotesCard lessonId={id!} studentId={lesson.studentId} />

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{lesson.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this lesson and all its sections. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => doDelete()}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="confirm-delete"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove section confirmation */}
      <AlertDialog open={!!confirmRemoveSection} onOpenChange={(open) => { if (!open) setConfirmRemoveSection(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {confirmRemoveSection ? SECTION_LABELS[confirmRemoveSection] : ''} section?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemoveSection && lesson.sections.find(s => s.sectionType === confirmRemoveSection)?.id &&
               contentBlocks[lesson.sections.find(s => s.sectionType === confirmRemoveSection)!.id]?.length
                ? 'This section has generated content that will be permanently removed.'
                : 'This section and its notes will be permanently removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemoveSection && handleRemoveSection(confirmRemoveSection)}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="confirm-remove-section"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link student dialog */}
      <AlertDialog open={linkStudentOpen} onOpenChange={setLinkStudentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Link a Student</AlertDialogTitle>
            <AlertDialogDescription>Choose the student this lesson is designed for.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Select value={linkStudentId} onValueChange={(v) => setLinkStudentId(v ?? '')}>
              <SelectTrigger data-testid="link-student-select">
                {linkStudentId
                  ? <span>{students.find(s => s.id === linkStudentId)?.name}</span>
                  : <SelectValue placeholder="Select a student" />}
              </SelectTrigger>
              <SelectContent>
                {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLinkStudent}
              disabled={!linkStudentId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Link Student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
