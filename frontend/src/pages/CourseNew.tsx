import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { GraduationCap, BookOpen, Loader2 } from 'lucide-react'
import { createCourse, type CreateCourseRequest, type CourseMode } from '../api/courses'
import { getCurriculumTemplates } from '../api/curricula'
import { getStudents } from '../api/students'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { cn } from '@/lib/utils'

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Other']
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const EXAMS = ['DELE', 'DALF', 'Cambridge B2 First', 'Cambridge C1 Advanced', 'TOEFL', 'IELTS']
const SESSION_COUNTS = [5, 8, 10, 12, 15, 20]

export default function CourseNew() {
  const navigate = useNavigate()

  const [mode, setMode] = useState<CourseMode>('general')
  const [name, setName] = useState('')
  const [language, setLanguage] = useState('')
  const [targetCefrLevel, setTargetCefrLevel] = useState('')
  const [targetExam, setTargetExam] = useState('')
  const [examDate, setExamDate] = useState('')
  const [sessionCount, setSessionCount] = useState('10')
  const [studentId, setStudentId] = useState<string | undefined>()
  const [useTemplate, setUseTemplate] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents(),
  })

  const { data: allTemplates } = useQuery({
    queryKey: ['curriculum-templates'],
    queryFn: getCurriculumTemplates,
    enabled: useTemplate && !!targetCefrLevel && mode === 'general',
  })

  const templates = allTemplates?.filter(t => t.cefrLevel === targetCefrLevel) ?? []
  const selectedTemplateData = templates.find(t => t.level === selectedTemplate)

  const students = studentsData?.items ?? []

  const { mutate: doCreate, isPending } = useMutation({
    mutationFn: () => {
      const req: CreateCourseRequest = {
        name,
        language,
        mode,
        sessionCount: useTemplate && selectedTemplateData
          ? selectedTemplateData.unitCount
          : parseInt(sessionCount),
        studentId: studentId || undefined,
        targetCefrLevel: mode === 'general' ? targetCefrLevel || undefined : undefined,
        targetExam: mode === 'exam-prep' ? targetExam || undefined : undefined,
        examDate: mode === 'exam-prep' && examDate ? examDate : undefined,
        templateLevel: useTemplate && selectedTemplate ? selectedTemplate : undefined,
      }
      return createCourse(req)
    },
    onSuccess: (course) => {
      navigate(`/courses/${course.id}`)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setSubmitError(msg ?? 'Failed to generate curriculum. Please try again.')
    },
  })

  const isValid = name.trim() && language &&
    (mode === 'general'
      ? !!targetCefrLevel && (!useTemplate || !!selectedTemplate)
      : !!targetExam)

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <PageHeader
        backTo="/courses"
        backLabel="Courses"
        title="New Course"
        subtitle="Plan a full curriculum and let AI generate your session schedule."
      />

      {isPending ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-zinc-500" data-testid="generating-curriculum">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">
            {useTemplate && selectedTemplate ? 'Creating course from template...' : 'Generating your curriculum...'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mode selection */}
          <div className="space-y-2">
            <Label>Course type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="mode-general"
                onClick={() => setMode('general')}
                className={cn(
                  'flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-colors',
                  mode === 'general'
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-zinc-200 hover:border-zinc-300'
                )}
              >
                <BookOpen className="h-5 w-5" />
                <span className="font-medium text-sm">General Learning</span>
                <span className="text-xs text-zinc-500">Structured progression toward a CEFR level</span>
              </button>
              <button
                type="button"
                data-testid="mode-exam-prep"
                onClick={() => setMode('exam-prep')}
                className={cn(
                  'flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-colors',
                  mode === 'exam-prep'
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-zinc-200 hover:border-zinc-300'
                )}
              >
                <GraduationCap className="h-5 w-5" />
                <span className="font-medium text-sm">Exam Preparation</span>
                <span className="text-xs text-zinc-500">Targeted prep for a specific exam</span>
              </button>
            </div>
          </div>

          {/* Course name */}
          <div className="space-y-1.5">
            <Label htmlFor="course-name">Course name</Label>
            <Input
              id="course-name"
              data-testid="course-name"
              placeholder="e.g. B2 English for Ana"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <Label>Language</Label>
            <Select value={language} onValueChange={v => setLanguage(v ?? '')}>
              <SelectTrigger data-testid="language-select">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode-specific fields */}
          {mode === 'general' ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Target CEFR level</Label>
                <Select
                  value={targetCefrLevel}
                  onValueChange={v => {
                    setTargetCefrLevel(v ?? '')
                    setSelectedTemplate('')
                  }}
                >
                  <SelectTrigger data-testid="cefr-select">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {CEFR_LEVELS.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template picker (only when CEFR level is selected) */}
              {targetCefrLevel && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="use-template"
                      data-testid="use-template-checkbox"
                      checked={useTemplate}
                      onChange={e => {
                        setUseTemplate(e.target.checked)
                        setSelectedTemplate('')
                      }}
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-normal text-zinc-700">
                      Use Instituto Cervantes curriculum template
                    </span>
                  </label>

                  {useTemplate && (
                    <div className="space-y-3 pl-6">
                      <div className="space-y-1.5">
                        <Select
                          value={selectedTemplate}
                          onValueChange={v => setSelectedTemplate(v ?? '')}
                        >
                          <SelectTrigger data-testid="template-select">
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map(t => (
                              <SelectItem key={t.level} value={t.level}>
                                {t.level} ({t.unitCount} units)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedTemplateData && selectedTemplateData.sampleGrammar.length > 0 && (
                        <Card className="border-zinc-100 bg-zinc-50" data-testid="template-preview">
                          <CardContent className="p-3 space-y-1">
                            <p className="text-xs font-medium text-zinc-600">Sample grammar</p>
                            <ul className="text-xs text-zinc-500 space-y-0.5">
                              {selectedTemplateData.sampleGrammar.map((g, i) => (
                                <li key={i}>{g}</li>
                              ))}
                            </ul>
                            <p className="text-xs text-zinc-400 pt-1">
                              {selectedTemplateData.unitCount} sessions will be created from the template
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Target exam</Label>
                <Select value={targetExam} onValueChange={v => setTargetExam(v ?? '')}>
                  <SelectTrigger data-testid="exam-select">
                    <SelectValue placeholder="Select exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAMS.map(e => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exam-date">Exam date (optional)</Label>
                <Input
                  id="exam-date"
                  data-testid="exam-date"
                  type="date"
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Session count (hidden when template is selected since it auto-sets) */}
          {!useTemplate && (
            <div className="space-y-1.5">
              <Label>Number of sessions</Label>
              <Select value={sessionCount} onValueChange={v => setSessionCount(v ?? '10')}>
                <SelectTrigger data-testid="session-count-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_COUNTS.map(n => (
                    <SelectItem key={n} value={String(n)}>{n} sessions</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Student (optional) */}
          {students.length > 0 && (
            <div className="space-y-1.5">
              <Label>Student (optional)</Label>
              <Select value={studentId ?? 'none'} onValueChange={v => setStudentId(v == null || v === 'none' ? undefined : v)}>
                <SelectTrigger data-testid="student-select">
                  <SelectValue placeholder="No specific student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific student</SelectItem>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {submitError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-3 text-sm text-red-700">{submitError}</CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => navigate('/courses')}
              type="button"
            >
              Cancel
            </Button>
            <Button
              data-testid="generate-curriculum-btn"
              disabled={!isValid}
              onClick={() => {
                setSubmitError(null)
                doCreate()
              }}
            >
              {useTemplate && selectedTemplate ? 'Create from Template' : 'Generate Curriculum'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
