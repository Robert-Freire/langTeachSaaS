import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Trash2, UserPlus, ChevronDown, ChevronUp, Save, Sparkles, CalendarPlus } from 'lucide-react'
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
import { FullLessonGenerateButton } from '@/components/lesson/FullLessonGenerateButton'
import { LessonNotesCard } from '@/components/lesson/LessonNotesCard'

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

function initSectionNotes(lesson: Lesson): Record<SectionType, string> {
  const notes: Record<SectionType, string> = {
    WarmUp: '', Presentation: '', Practice: '', Production: '', WrapUp: '',
  }
  for (const s of lesson.sections) {
    if (s.sectionType in notes) notes[s.sectionType as SectionType] = s.notes ?? ''
  }
  return notes
}

export default function LessonEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [metaExpanded, setMetaExpanded] = useState(false)
  const [schedulingInline, setSchedulingInline] = useState(false)
  const [inlineScheduleDate, setInlineScheduleDate] = useState('')
  const [linkStudentOpen, setLinkStudentOpen] = useState(false)
  const [linkStudentId, setLinkStudentId] = useState<string>('')

  // Inline title editing
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  // Section notes local state
  const [sectionNotes, setSectionNotes] = useState<Record<SectionType, string> | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Metadata edit state
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaDraft, setMetaDraft] = useState({ language: '', cefrLevel: '', topic: '', durationMinutes: 60, objectives: '', scheduledAt: '' })

  // AI content blocks: keyed by sectionId
  const [contentBlocks, setContentBlocks] = useState<Record<string, ContentBlockDto[]>>({})
  // Which section has the generate panel open (by SectionType)
  const [generateOpen, setGenerateOpen] = useState<SectionType | null>(null)
  // When regenerating: which block is being replaced
  const [regenerateParams, setRegenerateParams] = useState<{ sectionType: SectionType; blockType: ContentBlockType; style?: string } | null>(null)

  const { data: lesson, isLoading, isError } = useQuery({
    queryKey: ['lesson', id],
    queryFn: () => getLesson(id!),
    enabled: !!id,
  })

  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents(),
  })

  // Initialise local state from fetched lesson
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
    },
  })

  const { mutate: doUpdateSections, isPending: isSaving } = useMutation({
    mutationFn: (notes: Record<SectionType, string>) =>
      updateSections(id!, SECTION_ORDER.map((type, idx) => ({
        sectionType: type,
        orderIndex: idx,
        notes: notes[type] || null,
      }))),
    onSuccess: (updated) => {
      queryClient.setQueryData(['lesson', id], updated)
      logger.info('LessonEditor', 'sections saved', { id })
      setSavedAt(Date.now())
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSavedAt(null), 2500)
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
    if (!sectionNotes) return
    const updated = { ...sectionNotes, [type]: value }
    setSectionNotes(updated)
    if (isSaving) {
      logger.warn('LessonEditor', 'concurrent save detected — previous save still in-flight', { id })
    }
    doUpdateSections(updated)
  }, [sectionNotes, doUpdateSections, isSaving, id])

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

  const students = studentsData?.items ?? []

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-sm text-zinc-500">Loading lesson...</div>
  }
  if (isError || !lesson) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-red-600 font-medium">Lesson not found. <button onClick={() => navigate('/lessons')} className="underline">Go back</button></span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
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
            className="text-2xl font-semibold text-zinc-900 flex-1 cursor-pointer hover:text-indigo-700 transition-colors"
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

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete lesson"
            data-testid="delete-btn"
          >
            <Trash2 className="h-4 w-4 text-zinc-500" />
          </Button>

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
            Preview as Student
          </button>

          {savedAt && (
            <span className="text-xs text-green-600 flex items-center gap-1" data-testid="saved-indicator">
              <Save className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Metadata strip */}
      <Card className="bg-white border border-zinc-200">
        <CardHeader
          className="py-3 px-6 cursor-pointer"
          onClick={() => setMetaExpanded(!metaExpanded)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setMetaExpanded(v => !v)}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-200">{lesson.language}</Badge>
              <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200 bg-indigo-50">{lesson.cefrLevel}</Badge>
              <span className="text-xs text-zinc-500">{lesson.topic}</span>
              <span className="text-xs text-zinc-400">{lesson.durationMinutes} min</span>
              {lesson.scheduledAt && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">
                  {new Date(lesson.scheduledAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Badge>
              )}
            </div>
            {metaExpanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
          </div>
        </CardHeader>
        {metaExpanded && (
          <CardContent className="px-6 pb-6 pt-0 border-t border-zinc-100">
            {editingMeta ? (
              <div className="space-y-4 pt-4">
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
                  <Input
                    type="datetime-local"
                    value={metaDraft.scheduledAt}
                    onChange={(e) => setMetaDraft(d => ({ ...d, scheduledAt: e.target.value }))}
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
            ) : (
              <div className="pt-4 space-y-2">
                {lesson.scheduledAt && !schedulingInline ? (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-zinc-600">
                      <span className="font-medium">Scheduled:</span>{' '}
                      {new Date(lesson.scheduledAt).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSchedulingInline(true); setInlineScheduleDate(lesson.scheduledAt ? lesson.scheduledAt.slice(0, 16) : '') }}
                      className="text-xs text-indigo-600 hover:text-indigo-700 h-auto py-0.5 px-1.5"
                    >
                      Reschedule
                    </Button>
                  </div>
                ) : schedulingInline ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="datetime-local"
                      value={inlineScheduleDate}
                      onChange={(e) => setInlineScheduleDate(e.target.value)}
                      className="w-auto text-sm"
                      autoFocus
                      data-testid="inline-schedule-input"
                    />
                    <Button size="sm" onClick={handleQuickSchedule} disabled={!inlineScheduleDate} className="bg-indigo-600 hover:bg-indigo-700 text-white">Save</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setSchedulingInline(false); setInlineScheduleDate('') }}>Cancel</Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSchedulingInline(true)}
                    className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    data-testid="quick-schedule-btn"
                  >
                    <CalendarPlus className="h-4 w-4 mr-1.5" />
                    Schedule
                  </Button>
                )}
                {lesson.objectives && <p className="text-sm text-zinc-600"><span className="font-medium">Objectives:</span> {lesson.objectives}</p>}
                {lesson.studentId && students.find(s => s.id === lesson.studentId) && (
                  <p className="text-sm text-zinc-600"><span className="font-medium">Student:</span> {students.find(s => s.id === lesson.studentId)?.name}</p>
                )}
                <Button variant="outline" size="sm" onClick={() => setEditingMeta(true)}>Edit details</Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Link Student button */}
      {!lesson.studentId && students.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLinkStudentOpen(true)}
          data-testid="link-student-btn"
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          Link Student
        </Button>
      )}

      {/* Section panels */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-700">Lesson Sections</h2>
          {isSaving && <span className="text-xs text-zinc-400">Saving...</span>}
        </div>

        {sectionNotes && SECTION_ORDER.map((type) => {
          const sectionId = lesson.sections.find(s => s.sectionType === type)?.id ?? null
          const blocks = sectionId ? (contentBlocks[sectionId] ?? []) : []
          const isGenerateOpen = generateOpen === type

          return (
            <Card key={type} className="bg-white border border-zinc-200">
              <CardHeader className="py-3 px-6 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-zinc-700">{SECTION_LABELS[type]}</CardTitle>
                  {sectionId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRegenerateParams(null)
                        setGenerateOpen(isGenerateOpen ? null : type)
                      }}
                      className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                      data-testid={`generate-btn-${type.toLowerCase()}`}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Generate
                    </Button>
                  )}
                  {!sectionId && (
                    <span className="text-xs text-zinc-400" title="Save the lesson first to enable AI generation">Generate</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-4 space-y-3">
                <Textarea
                  value={sectionNotes[type]}
                  onChange={(e) => setSectionNotes(n => n ? { ...n, [type]: e.target.value } : n)}
                  onBlur={(e) => handleSectionBlur(type, e.target.value)}
                  placeholder={`Add notes for ${SECTION_LABELS[type]}...`}
                  rows={4}
                  className="resize-none text-sm"
                  data-testid={`section-${type.toLowerCase()}`}
                />

                {blocks.map(block => (
                  <ContentBlock
                    key={block.id}
                    block={block}
                    lessonId={id!}
                    onUpdate={handleBlockUpdate}
                    onDelete={(blockId) => handleBlockDelete(blockId, sectionId!)}
                    onRegenerate={(blockType, params) => {
                      let style: string | undefined
                      if (params) {
                        try { style = (JSON.parse(params) as { style?: string }).style } catch { /* ignore */ }
                      }
                      setRegenerateParams({ sectionType: type, blockType: blockType as ContentBlockType, style })
                      setGenerateOpen(type)
                    }}
                  />
                ))}

                {isGenerateOpen && sectionId && (
                  <GeneratePanel
                    lessonId={id!}
                    sectionId={sectionId}
                    sectionType={type}
                    initialTaskType={regenerateParams?.sectionType === type ? regenerateParams.blockType : undefined}
                    initialStyle={regenerateParams?.sectionType === type ? regenerateParams.style : undefined}
                    lessonContext={{
                      language: lesson.language,
                      cefrLevel: lesson.cefrLevel,
                      topic: lesson.topic,
                      studentId: lesson.studentId,
                      existingNotes: sectionNotes[type] || null,
                    }}
                    onInsert={(block) => {
                      handleBlockInsert(block)
                      setRegenerateParams(null)
                    }}
                    onClose={() => {
                      setGenerateOpen(null)
                      setRegenerateParams(null)
                    }}
                  />
                )}
              </CardContent>
            </Card>
          )
        })}
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
