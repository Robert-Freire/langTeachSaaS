import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, MessageSquare, FileText, PenLine, GraduationCap, Plus, ArrowLeft } from 'lucide-react'
import { getLessonTemplates, createLesson, type LessonTemplate } from '../api/lessons'
import { getStudents } from '../api/students'
import { logger } from '../lib/logger'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/PageHeader'
import { CEFR_LEVELS } from '@/lib/cefr-colors'
import { LANGUAGES } from '@/lib/languages'

const DURATIONS = [30, 45, 60, 90]

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  'Conversation': <MessageSquare className="h-6 w-6" />,
  'Grammar Focus': <FileText className="h-6 w-6" />,
  'Reading & Comprehension': <BookOpen className="h-6 w-6" />,
  'Writing Skills': <PenLine className="h-6 w-6" />,
  'Exam Prep': <GraduationCap className="h-6 w-6" />,
}

export default function LessonNew() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const courseId = searchParams.get('courseId') ?? undefined
  const entryId = searchParams.get('entryId') ?? undefined

  const [step, setStep] = useState<1 | 2>(entryId ? 2 : 1)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const grammarParam = searchParams.get('grammar')

  const [title, setTitle] = useState(searchParams.get('topic') ?? '')
  const [language, setLanguage] = useState(searchParams.get('language') ?? '')
  const [cefrLevel, setCefrLevel] = useState(searchParams.get('level') ?? '')
  const [topic, setTopic] = useState(searchParams.get('topic') ?? '')
  const [duration, setDuration] = useState('60')
  const [objectives, setObjectives] = useState(grammarParam ? `Grammar focus: ${grammarParam}` : '')
  const [studentId, setStudentId] = useState<string | undefined>(searchParams.get('studentId') ?? undefined)
  const [scheduledAt, setScheduledAt] = useState(searchParams.get('scheduledAt') ?? '')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [autoFilled, setAutoFilled] = useState<'language' | 'level' | 'both' | null>(null)

  useEffect(() => {
    if (!autoFilled) return
    const t = setTimeout(() => setAutoFilled(null), 2000)
    return () => clearTimeout(t)
  }, [autoFilled])

  const { data: templates, isLoading: templatesLoading, isError: templatesError, refetch: refetchTemplates } = useQuery({
    queryKey: ['lesson-templates'],
    queryFn: getLessonTemplates,
  })

  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents(),
  })

  const { mutate: doCreate, isPending } = useMutation({
    mutationFn: () => createLesson({
      title,
      language,
      cefrLevel,
      topic,
      durationMinutes: parseInt(duration),
      objectives: objectives || null,
      templateId: selectedTemplateId,
      studentId: studentId ?? null,
      scheduledAt: scheduledAt || undefined,
      courseId,
      courseEntryId: entryId,
    }),
    onSuccess: (lesson) => {
      logger.info('LessonNew', 'lesson created', { id: lesson.id, templateId: selectedTemplateId })
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      }
      navigate(`/lessons/${lesson.id}`)
    },
    onError: (err) => {
      logger.error('LessonNew', 'create failed', err)
      setSubmitError('Failed to create lesson. Please try again.')
    },
  })

  const students = studentsData?.items ?? []

  function handleStudentChange(value: string | null) {
    const id = !value || value === 'none' ? undefined : value
    setStudentId(id)

    if (!id) return

    // students list is from query cache; find returns undefined if query hasn't resolved yet — auto-fill silently skips in that case
    const student = students.find(s => s.id === id)
    if (!student) return

    const willFillLanguage = !!student.learningLanguage
    const willFillLevel = !!student.cefrLevel

    if (willFillLanguage) setLanguage(student.learningLanguage)
    if (willFillLevel) setCefrLevel(student.cefrLevel)

    if (willFillLanguage && willFillLevel) setAutoFilled('both')
    else if (willFillLanguage) setAutoFilled('language')
    else if (willFillLevel) setAutoFilled('level')
  }

  const isFormValid = title.trim() && language && cefrLevel && topic.trim()

  // Step 1: template picker
  if (step === 1) {
    return (
      <div className="space-y-6 max-w-3xl">
        <PageHeader
          backTo="/lessons"
          backLabel="Lessons"
          title="New Lesson"
          subtitle="Choose a template to get started, or start from blank."
        />

        {templatesLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-lg border border-zinc-200 bg-white p-4 space-y-2">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : templatesError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-red-600 font-medium">Failed to load templates.</p>
            <button onClick={() => refetchTemplates()} className="text-sm text-indigo-600 underline hover:text-indigo-800">Retry</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3" data-testid="template-grid">
            {(templates ?? []).map((t: LessonTemplate) => (
              <button
                key={t.id}
                onClick={() => { setSelectedTemplateId(t.id); setStep(2) }}
                data-testid={`template-${t.name.replace(/\s+/g, '-').toLowerCase()}`}
                className={cn(
                  'text-left rounded-lg border p-4 transition-all hover:border-indigo-300 hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-500',
                  selectedTemplateId === t.id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-zinc-200 bg-white'
                )}
              >
                <div className="text-indigo-600 mb-2">
                  {TEMPLATE_ICONS[t.name] ?? <BookOpen className="h-6 w-6" />}
                </div>
                <p className="font-medium text-sm text-zinc-900">{t.name}</p>
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{t.description}</p>
              </button>
            ))}

            {/* Blank option */}
            <button
              onClick={() => { setSelectedTemplateId(null); setStep(2) }}
              data-testid="template-blank"
              className="text-left rounded-lg border border-dashed border-zinc-300 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <div className="text-zinc-400 mb-2">
                <Plus className="h-6 w-6" />
              </div>
              <p className="font-medium text-sm text-zinc-900">Blank</p>
              <p className="text-xs text-zinc-500 mt-1">Start with empty sections.</p>
            </button>
          </div>
        )}
      </div>
    )
  }

  // Step 2: metadata form
  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setStep(1)}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
          aria-label="Back to template selection"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Lesson Details</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {selectedTemplateId
              ? `Using template: ${templates?.find(t => t.id === selectedTemplateId)?.name ?? ''}`
              : 'Blank lesson'}
          </p>
        </div>
      </div>

      <Card className="bg-white border border-zinc-200">
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Present Perfect in Context"
              data-testid="input-title"
            />
          </div>

          {(students.length > 0 || !!studentId) && (
            <div className="space-y-2">
              <Label htmlFor="student">Link Student (optional)</Label>
              <Select value={studentId ?? 'none'} onValueChange={handleStudentChange}>
                <SelectTrigger id="student" data-testid="select-student">
                  {studentId
                    ? <span>{students.find(s => s.id === studentId)?.name}</span>
                    : <span className="text-muted-foreground">No student linked</span>}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No student</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500" data-testid="student-autofill-hint">
                Selecting a student auto-fills language and level.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language <span className="text-red-500">*</span></Label>
              <Select value={language} onValueChange={(v) => setLanguage(v ?? '')}>
                <SelectTrigger
                  id="language"
                  data-testid="select-language"
                  className={cn((autoFilled === 'language' || autoFilled === 'both') && 'ring-2 ring-indigo-400 transition-all')}
                >
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cefr">CEFR Level <span className="text-red-500">*</span></Label>
              <Select value={cefrLevel} onValueChange={(v) => setCefrLevel(v ?? '')}>
                <SelectTrigger
                  id="cefr"
                  data-testid="select-level"
                  className={cn((autoFilled === 'level' || autoFilled === 'both') && 'ring-2 ring-indigo-400 transition-all')}
                >
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {CEFR_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Topic <span className="text-red-500">*</span></Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Travel and holidays"
              data-testid="input-topic"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Select value={duration} onValueChange={(v) => setDuration(v ?? '60')}>
              <SelectTrigger id="duration" data-testid="select-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Scheduled Date & Time</Label>
            <DateTimePicker
              value={scheduledAt}
              onChange={setScheduledAt}
              data-testid="input-scheduled-at"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objectives">Learning Objectives</Label>
            <Textarea
              id="objectives"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="What will the student be able to do by the end of this lesson?"
              rows={3}
              data-testid="input-objectives"
            />
          </div>

          {submitError && (
            <p className="text-sm text-red-600" data-testid="submit-error">{submitError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate('/lessons')}>Cancel</Button>
            <Button
              onClick={() => doCreate()}
              disabled={!isFormValid || isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              data-testid="submit-lesson"
            >
              {isPending ? 'Creating...' : 'Create Lesson'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
