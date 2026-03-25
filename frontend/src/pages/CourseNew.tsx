import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { GraduationCap, BookOpen, Loader2 } from 'lucide-react'
import { createCourse, type CreateCourseRequest, type CourseMode } from '../api/courses'
import { getCurriculumTemplates, getMappingPreview } from '../api/curricula'
import { getStudents } from '../api/students'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { cn } from '@/lib/utils'
import { CEFR_LEVELS } from '@/lib/cefr-colors'
import { CefrMismatchWarning } from '@/components/CefrMismatchWarning'
import { CompetencyGapWarning } from '@/components/CompetencyGapWarning'
import { StudentProfileSummary } from '@/components/StudentProfileSummary'
import { SessionMappingPreview } from '@/components/SessionMappingPreview'

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Other']
const EXAMS = ['DELE', 'DALF', 'Cambridge B2 First', 'Cambridge C1 Advanced', 'TOEFL', 'IELTS']
const SESSION_COUNTS = [5, 8, 10, 12, 15, 20]

export default function CourseNew() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const lockedStudentId = searchParams.get('studentId') ?? undefined

  const [mode, setMode] = useState<CourseMode>('general')
  const [name, setName] = useState('')
  const [language, setLanguage] = useState('')
  const [targetCefrLevel, setTargetCefrLevel] = useState('')
  const [targetExam, setTargetExam] = useState('')
  const [examDate, setExamDate] = useState('')
  const [sessionCount, setSessionCount] = useState('10')
  const [studentId, setStudentId] = useState<string | undefined>(lockedStudentId)
  const [useTemplate, setUseTemplate] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [teacherNotes, setTeacherNotes] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: studentsData } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents(),
  })

  const { data: allTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ['curriculum-templates'],
    queryFn: getCurriculumTemplates,
    enabled: !!targetCefrLevel && mode === 'general',
  })

  const templates = allTemplates?.filter(t => t.cefrLevel === targetCefrLevel) ?? []

  const { data: mappingPreview, isError: mappingError } = useQuery({
    queryKey: ['mapping-preview', selectedTemplate, sessionCount],
    queryFn: () => getMappingPreview(selectedTemplate, parseInt(sessionCount, 10)),
    enabled: useTemplate && !!selectedTemplate && !!sessionCount,
  })

  const students = studentsData?.items ?? []

  // Auto-fill language and CEFR level from the locked student when the students list loads.
  // Intentionally omits language/targetCefrLevel from deps: we only want to seed the fields
  // on first load (when they're empty), never overwrite user edits on subsequent renders.
  // If the students list ever refetches, the guards (if !language / if !targetCefrLevel) prevent
  // overwriting values the user may have manually changed.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!lockedStudentId || students.length === 0) return
    const student = students.find(s => s.id === lockedStudentId)
    if (!student) return
    if (!language) setLanguage(student.learningLanguage)
    if (!targetCefrLevel) setTargetCefrLevel(student.cefrLevel)
  }, [students, lockedStudentId]) // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const { mutate: doCreate, isPending } = useMutation({
    mutationFn: () => {
      const req: CreateCourseRequest = {
        name,
        language,
        mode,
        sessionCount: parseInt(sessionCount, 10),
        studentId: studentId || undefined,
        targetCefrLevel: mode === 'general' ? targetCefrLevel || undefined : undefined,
        targetExam: mode === 'exam-prep' ? targetExam || undefined : undefined,
        examDate: mode === 'exam-prep' && examDate ? examDate : undefined,
        templateLevel: useTemplate && selectedTemplate ? selectedTemplate : undefined,
        teacherNotes: studentId ? (teacherNotes.trim() || undefined) : undefined,
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
                onClick={() => { setMode('general') }}
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
                onClick={() => { setMode('exam-prep'); setUseTemplate(false); setSelectedTemplate('') }}
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
                      Use structured curriculum template
                    </span>
                  </label>

                  {useTemplate && (
                    <div className="space-y-3 pl-6">
                      <div className="space-y-1.5">
                        <Select
                          value={selectedTemplate}
                          onValueChange={v => setSelectedTemplate(v ?? '')}
                          disabled={templatesLoading}
                        >
                          <SelectTrigger data-testid="template-select">
                            <SelectValue placeholder={templatesLoading ? 'Loading templates...' : 'Select a template'} />
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

                      {mappingPreview && (
                        <SessionMappingPreview mapping={mappingPreview} />
                      )}
                      {mappingError && (
                        <p className="text-xs text-red-600" data-testid="mapping-preview-error">
                          Could not load session mapping preview.
                        </p>
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

          {/* Session count */}
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

          {/* Student */}
          {lockedStudentId ? (
            <div className="space-y-1.5">
              <Label>Student</Label>
              {students.length === 0
                ? <Skeleton className="h-9 w-full" data-testid="student-locked-loading" />
                : <div
                    className="flex h-9 w-full items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700"
                    data-testid="student-locked"
                  >
                    {students.find(s => s.id === lockedStudentId)?.name ?? lockedStudentId}
                  </div>
              }
            </div>
          ) : students.length > 0 ? (
            <div className="space-y-1.5">
              <Label>Student (optional)</Label>
              <Select value={studentId ?? 'none'} onValueChange={v => {
                const next = v == null || v === 'none' ? undefined : v
                setStudentId(next)
                if (!next) setTeacherNotes('')
              }}>
                <SelectTrigger data-testid="student-select">
                  {studentId
                    ? <span>{students.find(s => s.id === studentId)?.name ?? 'No specific student'}</span>
                    : <span className="text-muted-foreground">No specific student</span>
                  }
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific student</SelectItem>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {/* Student profile summary */}
          {studentId && (() => {
            const selectedStudent = students.find(s => s.id === studentId)
            return selectedStudent ? <StudentProfileSummary student={selectedStudent} /> : null
          })()}

          {/* Teacher notes — only shown when a student is selected, since notes only influence AI personalization when a student profile is present */}
          {studentId && (
            <div className="space-y-1.5">
              <Label htmlFor="teacher-notes">Teacher notes (optional)</Label>
              <Textarea
                id="teacher-notes"
                data-testid="teacher-notes"
                placeholder="e.g., Relocating to Barcelona. Hates role-play. Needs formal register."
                value={teacherNotes}
                onChange={e => setTeacherNotes(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-zinc-500">Extra context the AI will use to personalize sessions.</p>
            </div>
          )}

          {/* Competency gap warning — shown when teacher notes suggest core skill constraints */}
          {studentId && teacherNotes.trim() && (
            <CompetencyGapWarning
              key={studentId}
              teacherNotes={teacherNotes}
              sessionCount={parseInt(sessionCount, 10)}
            />
          )}

          {/* CEFR mismatch warning (general mode only) */}
          {mode === 'general' && studentId && targetCefrLevel && (() => {
            const selectedStudent = students.find(s => s.id === studentId)
            return selectedStudent ? (
              <CefrMismatchWarning
                key={studentId}
                studentName={selectedStudent.name}
                studentLevel={selectedStudent.cefrLevel}
                lessonLevel={targetCefrLevel}
              />
            ) : null
          })()}

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
