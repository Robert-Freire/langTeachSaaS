import { useCallback, useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Trash2, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react'
import { getStudent, createStudent, updateStudent, deleteStudent, type StudentFormData, type Difficulty, type StudentWeaknessItem, type ShortTermObjective, type LearningGoalItem } from '../api/students'
import { TeachingTodosCard } from '@/components/student/TeachingTodosCard'
import { getObjectiveUrgency } from '@/lib/objectiveUrgency'
import { COMPETENCY_OPTIONS } from '../lib/studentOptions'
import { logger } from '../lib/logger'
import { newId } from '@/lib/newId'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { MultiSelect } from '@/components/ui/multi-select'
import { LearningGoalTreeEditor } from '@/components/student/LearningGoalTreeEditor'
import { StudentCoursesCard } from '@/components/student/StudentCoursesCard'
import { StudentFollowupsCard } from '@/components/student/StudentFollowupsCard'
import { SectionHeader } from '@/components/student/SectionHeader'
import { getFollowups } from '@/api/followups'
import { FieldTooltip } from '@/components/FieldTooltip'
import { PageHeader } from '@/components/PageHeader'
import { CEFR_LEVELS } from '@/lib/cefr-colors'
import { CefrBadge } from '@/components/dashboard/CefrBadge'
import { LANGUAGES, NATIVE_LANGUAGE_OPTIONS } from '@/lib/languages'
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

const FORM_SECTIONS = [
  { id: 'section-basic', label: 'Basic Info' },
  { id: 'section-background', label: 'Background' },
  { id: 'section-proficiency', label: 'Proficiency' },
  { id: 'section-teaching-goals', label: 'Teaching Goals' },
  { id: 'section-difficulties', label: 'Difficulties' },
  { id: 'section-notes', label: 'Notes' },
  { id: 'section-commercial', label: 'Commercial' },
]

// Scrollspy tracks these in order. section-proficiency is now below section-basic
// (Skill Overrides moved lower per Stitch placement), so it gets its own Y position.
const SCROLLSPY_IDS = [
  'section-basic',
  'section-proficiency',
  'section-background',
  'section-teaching-goals',
  'section-difficulties',
  'section-notes',
  'section-commercial',
]

export default function StudentForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [name, setName] = useState('')
  const [language, setLanguage] = useState('')
  const [cefrLevel, setCefrLevel] = useState('')
  const [officialCefrLevel, setOfficialCefrLevel] = useState<string>('')
  const [interests, setInterests] = useState<string[]>([])
  const [interestInput, setInterestInput] = useState('')
  const [nativeLanguages, setNativeLanguages] = useState<string[]>([])
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>([])
  const [spokenInput, setSpokenInput] = useState('')
  const [skillLevelOverrides, setSkillLevelOverrides] = useState<Record<string, string>>({})
  const [learningGoals, setLearningGoals] = useState<LearningGoalItem[]>([])
  const [weaknesses, setWeaknesses] = useState<StudentWeaknessItem[]>([])
  const [difficulties, setDifficulties] = useState<Difficulty[]>([])
  const [personalNotes, setPersonalNotes] = useState('')
  const [teachingNotes, setTeachingNotes] = useState('')
  const [birthYear, setBirthYear] = useState<number | null>(null)
  const [profession, setProfession] = useState('')
  const [countryOfOrigin, setCountryOfOrigin] = useState('')
  const [cityOfOrigin, setCityOfOrigin] = useState('')
  const [countryOfResidence, setCountryOfResidence] = useState('')
  const [cityOfResidence, setCityOfResidence] = useState('')
  const [reasonForStudying, setReasonForStudying] = useState('')
  const [shortTermObjectives, setShortTermObjectives] = useState<ShortTermObjective[]>([])
  const [isActive, setIsActive] = useState(true)
  const [isCorporate, setIsCorporate] = useState(false)
  const [rate, setRate] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState(SCROLLSPY_IDS[0])
  const [editingCefrField, setEditingCefrField] = useState<string | null>(null)
  const interestInputRef = useRef<HTMLInputElement>(null)
  const spokenInputRef = useRef<HTMLInputElement>(null)

  const { data: existing, isLoading, isError } = useQuery({
    queryKey: ['students', id],
    queryFn: () => getStudent(id!),
    enabled: isEdit,
  })

  const { data: followups = [], refetch: refetchFollowups } = useQuery({
    queryKey: ['followups', id],
    queryFn: () => getFollowups(id!),
    enabled: isEdit && !!id,
  })

  // Separate query for sidebar todos — intentionally uses the singular key ['student', id]
  // (not ['students', id] used by the form) so that invalidating it on todo mutations
  // does NOT trigger a refetch of the form data and reset unsaved field edits.
  const { data: sidebarStudent } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id!),
    enabled: isEdit && !!id,
  })
  const sidebarTodos = sidebarStudent?.teachingTodos ?? existing?.teachingTodos ?? []
  const onSidebarTodoChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['student', id] })
  }, [queryClient, id])

  // Sync server student data to local form state
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setLanguage(existing.learningLanguage)
      setCefrLevel(existing.cefrLevel)
      setOfficialCefrLevel(existing.officialCefrLevel ?? '')
      setInterests(existing.interests)
      setNativeLanguages(existing.nativeLanguages)
      setSpokenLanguages(existing.spokenLanguages ?? [])
      setSkillLevelOverrides(existing.skillLevelOverrides ?? {})
      setLearningGoals(existing.learningGoals)
      setWeaknesses(existing.weaknesses)
      setDifficulties(existing.difficulties ?? [])
      setPersonalNotes(existing.personalNotes ?? '')
      setTeachingNotes(existing.teachingNotes ?? '')
      setBirthYear(existing.birthYear ?? null)
      setProfession(existing.profession ?? '')
      setCountryOfOrigin(existing.countryOfOrigin ?? '')
      setCityOfOrigin(existing.cityOfOrigin ?? '')
      setCountryOfResidence(existing.countryOfResidence ?? '')
      setCityOfResidence(existing.cityOfResidence ?? '')
      setReasonForStudying(existing.reasonForStudying ?? '')
      setShortTermObjectives(existing.shortTermObjectives ?? [])
      setIsActive(existing.isActive ?? true)
      setIsCorporate(existing.isCorporate ?? false)
      setRate(existing.rate ?? '')
    }
  }, [existing])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Scrollspy: listen on the main scroll container
  useEffect(() => {
    if (!isEdit) return
    const container = document.querySelector('main')
    if (!container) return
    function onScroll() {
      const offset = 80
      let current = SCROLLSPY_IDS[0]
      for (const sid of SCROLLSPY_IDS) {
        const el = document.getElementById(sid)
        if (el && el.getBoundingClientRect().top <= offset) current = sid
      }
      setActiveSection(current)
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [isEdit])

  function scrollToSection(sid: string) {
    const container = document.querySelector('main')
    const el = document.getElementById(sid)
    if (!el || !container) return
    const elTop =
      el.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop
    container.scrollTo({ top: elTop - 60, behavior: 'smooth' })
  }

  const { mutate, isPending } = useMutation({
    mutationFn: (data: StudentFormData) =>
      isEdit ? updateStudent(id!, data) : createStudent(data),
    onSuccess: (student) => {
      logger.info('StudentForm', isEdit ? 'student updated' : 'student created')
      queryClient.invalidateQueries({ queryKey: ['students'] })
      navigate(`/students/${student.id}`)
    },
    onError: (err) => logger.error('StudentForm', 'save failed', err),
  })

  const { mutate: doDelete, isPending: isDeleting } = useMutation({
    mutationFn: (studentId: string) => deleteStudent(studentId),
    onSuccess: () => {
      logger.info('StudentForm', 'student deleted')
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowDeleteDialog(false)
      setDeleteError(null)
      navigate('/students')
    },
    onError: (err) => {
      logger.error('StudentForm', 'delete failed', err)
      setDeleteError('Failed to delete student. Please try again.')
      setShowDeleteDialog(false)
    },
  })

  const isBusy = isPending || isDeleting

  function addInterest(value: string) {
    const trimmed = value.trim()
    if (trimmed && !interests.includes(trimmed)) {
      setInterests((prev) => [...prev, trimmed])
    }
    setInterestInput('')
  }

  function handleInterestKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addInterest(interestInput)
    }
    if (e.key === 'Backspace' && interestInput === '' && interests.length > 0) {
      setInterests((prev) => prev.slice(0, -1))
    }
  }

  function removeInterest(interest: string) {
    setInterests((prev) => prev.filter((i) => i !== interest))
  }

  function addSpokenLanguage(value: string) {
    const trimmed = value.trim()
    if (trimmed && !spokenLanguages.includes(trimmed)) {
      setSpokenLanguages((prev) => [...prev, trimmed])
    }
    setSpokenInput('')
  }

  function handleSpokenKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSpokenLanguage(spokenInput)
    }
    if (e.key === 'Backspace' && spokenInput === '' && spokenLanguages.length > 0) {
      setSpokenLanguages((prev) => prev.slice(0, -1))
    }
  }

  function removeSpokenLanguage(lang: string) {
    setSpokenLanguages((prev) => prev.filter((l) => l !== lang))
  }

  function setSkillOverride(skill: string, value: string) {
    setSkillLevelOverrides((prev) => {
      if (!value) {
        const next = { ...prev }
        delete next[skill]
        return next
      }
      return { ...prev, [skill]: value }
    })
  }

  function addWeakness() {
    setWeaknesses((prev) => [...prev, { description: '', weaknessType: 'grammatical' as const }])
  }

  function updateWeakness(index: number, field: keyof StudentWeaknessItem, value: string) {
    setWeaknesses((prev) =>
      prev.map((w, i) => (i === index ? { ...w, [field]: value } : w))
    )
  }

  function removeWeakness(index: number) {
    setWeaknesses((prev) => prev.filter((_, i) => i !== index))
  }

  function addDifficulty() {
    setDifficulties((prev) => [
      ...prev,
      { id: newId(), description: '', competency: '', subcategory: '', severity: 'medium', trend: 'stable', status: 'Active' },
    ])
  }

  function updateDifficulty(diffId: string, field: keyof Difficulty, value: string) {
    setDifficulties((prev) =>
      prev.map((d) => (d.id === diffId ? { ...d, [field]: value } : d))
    )
    setErrors((prev) => {
      const key = `difficulty-${diffId}`
      if (!prev[key]) return prev
      const current = difficulties.find((d) => d.id === diffId)
      if (current) {
        const nextRow = { ...current, [field]: value }
        const hasDesc = nextRow.description.trim().length > 0
        const hasCom = nextRow.competency.length > 0
        const shouldClear = (hasDesc && hasCom) || (!hasDesc && !hasCom)
        if (!shouldClear) return prev
      }
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function removeDifficulty(diffId: string) {
    setDifficulties((prev) => prev.filter((d) => d.id !== diffId))
    setErrors((prev) => {
      const key = `difficulty-${diffId}`
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function addObjective() {
    setShortTermObjectives((prev) => [...prev, { id: newId(), text: '', targetDate: null }])
  }

  function updateObjective(objId: string, field: 'text' | 'targetDate', value: string | null) {
    setShortTermObjectives((prev) =>
      prev.map((o) => (o.id === objId ? { ...o, [field]: value } : o))
    )
  }

  function removeObjective(objId: string) {
    setShortTermObjectives((prev) => prev.filter((o) => o.id !== objId))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!language) errs.language = 'Language is required'
    if (!cefrLevel) errs.cefrLevel = 'CEFR level is required'
    difficulties.forEach((d) => {
      const hasDesc = d.description.trim().length > 0
      const hasCom = d.competency.length > 0
      if ((hasDesc || hasCom) && !(hasDesc && hasCom)) {
        errs[`difficulty-${d.id}`] = 'Both type and description are required'
      }
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const finalInterests = interestInput.trim()
      ? [...interests, interestInput.trim()]
      : interests
    const validDifficulties = difficulties.filter(
      (d) => d.competency && d.description.trim()
    )
    const validWeaknesses = weaknesses.filter((w) => w.description.trim())
    const finalSpoken = spokenInput.trim()
      ? [...spokenLanguages, spokenInput.trim()]
      : spokenLanguages
    mutate({
      name: name.trim(),
      learningLanguage: language,
      cefrLevel,
      officialCefrLevel: officialCefrLevel || null,
      interests: finalInterests,
      nativeLanguages,
      spokenLanguages: finalSpoken,
      skillLevelOverrides,
      learningGoals,
      weaknesses: validWeaknesses,
      difficulties: validDifficulties,
      personalNotes: personalNotes.trim() || null,
      teachingNotes: teachingNotes.trim() || null,
      birthYear: birthYear ?? null,
      profession: profession.trim() || null,
      countryOfOrigin: countryOfOrigin.trim() || null,
      cityOfOrigin: cityOfOrigin.trim() || null,
      countryOfResidence: countryOfResidence.trim() || null,
      cityOfResidence: cityOfResidence.trim() || null,
      reasonForStudying: reasonForStudying.trim() || null,
      shortTermObjectives: shortTermObjectives.filter((o) => o.text.trim()),
      isActive,
      isCorporate,
      rate: rate.trim() || null,
    })
  }

  if (isEdit && isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56 mt-2" />
        </div>
        <Card>
          <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full max-w-sm" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
          <CardContent><Skeleton className="h-10 w-full max-w-sm" /></CardContent>
        </Card>
      </div>
    )
  }

  if (isEdit && (isError || (!isLoading && !existing))) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-red-600 font-medium">Student not found. <button onClick={() => navigate('/students')} className="underline hover:text-zinc-700 transition-colors">Go back</button></span>
      </div>
    )
  }

  return (
    <>
      {/* Page header — always at top, full width */}
      <PageHeader
        backTo="/students"
        backLabel="Students"
        title={isEdit ? 'Edit Student' : 'Add Student'}
        subtitle={isEdit ? "Update this student's profile." : 'Create a new student profile.'}
        actions={
          <div className="flex items-center gap-3">
            {isEdit && id && (() => {
              const canCreateCourse = !!language && !!cefrLevel
              return canCreateCourse ? (
                <Button type="button" variant="outline" data-testid="create-course-btn" onClick={() => navigate(`/courses/new?studentId=${id}`)}>
                  Create Course
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger render={<span tabIndex={0} className="inline-flex" />}>
                    <Button type="button" variant="outline" disabled data-testid="create-course-btn">
                      Create Course
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Complete student profile (language and CEFR level required) to create a course.
                  </TooltipContent>
                </Tooltip>
              )
            })()}
            {!isEdit && (
              <>
                <Button type="button" variant="outline" onClick={() => navigate('/students')}>
                  Cancel
                </Button>
                <Button type="submit" form="student-form" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isPending ? 'Saving...' : 'Save Student'}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Inactive badge — only shown when student is deactivated */}
      {isEdit && !isActive && (
        <div className="mt-2">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-500 border border-zinc-200"
            data-testid="inactive-badge"
          >
            Inactive
          </span>
        </div>
      )}

      {/* Sticky section nav — edit mode only, renders below header so it sticks as header scrolls away */}
      {isEdit && (
        <div className="sticky top-14 lg:top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-zinc-100 flex items-center gap-3 py-2 -mx-4 lg:-mx-6 px-4 lg:px-6 mt-4 mb-6" data-testid="section-nav">
          <nav className="flex items-center gap-1 overflow-x-auto shrink min-w-0" style={{ scrollbarWidth: 'none' }} aria-label="Form sections">
            {FORM_SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollToSection(s.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSection === s.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
                data-testid={`section-nav-${s.id}`}
              >
                {s.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate('/students')}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="student-form"
              size="sm"
              disabled={isBusy}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isPending ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </div>
      )}

      <div className={isEdit ? 'grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start' : 'max-w-2xl space-y-6'}>
        <div className="space-y-6">

          <form id="student-form" onSubmit={handleSubmit} className="space-y-6">

            {/* ── SECTION: Basic Info + Proficiency (2-column on desktop) ── */}
            <div id="section-basic" className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-6 items-start">
              <div className="space-y-6">
                {/* Basic Info card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Basic Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="inline-flex items-center gap-1">Name <span className="text-red-500">*</span> <FieldTooltip fieldKey="name" /></Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ana García"
                        maxLength={200}
                        className="max-w-sm"
                        data-testid="student-name"
                      />
                      {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                    </div>

                    {/* Learning Language + Teacher's Assessment side-by-side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
                      <div className="space-y-1.5">
                        <Label className="inline-flex items-center gap-1">Learning Language <span className="text-red-500">*</span> <FieldTooltip fieldKey="learningLanguage" /></Label>
                        <Select value={language} onValueChange={(v) => {
                          if (!v) return
                          setLanguage(v)
                        }}>
                          <SelectTrigger data-testid="student-language">
                            <SelectValue placeholder="Select a language" />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.map((lang) => (
                              <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.language && <p className="text-xs text-red-600">{errors.language}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="inline-flex items-center gap-1">Teacher's Assessment <span className="text-red-500">*</span> <FieldTooltip fieldKey="cefrLevel" /></Label>
                        {cefrLevel && editingCefrField !== 'cefrLevel' ? (
                          <button
                            type="button"
                            onClick={() => setEditingCefrField('cefrLevel')}
                            className="block"
                            aria-label="Edit Teacher's Assessment level"
                            data-testid="student-cefr-badge"
                          >
                            <CefrBadge level={cefrLevel} className="cursor-pointer hover:opacity-80 transition-opacity" />
                          </button>
                        ) : (
                          <Select
                            value={cefrLevel}
                            onValueChange={(v) => { if (v) { setCefrLevel(v); setEditingCefrField(null) } }}
                            // undefined = let Radix control open state; false would suppress user-triggered opens
                            open={editingCefrField === 'cefrLevel' || undefined}
                            onOpenChange={(open) => { if (!open) setEditingCefrField(null) }}
                          >
                            <SelectTrigger data-testid="student-cefr">
                              <SelectValue placeholder="Select a level" />
                            </SelectTrigger>
                            <SelectContent>
                              {CEFR_LEVELS.map((level) => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {errors.cefrLevel && <p className="text-xs text-red-600">{errors.cefrLevel}</p>}
                      </div>
                    </div>

                    {/* Official CEFR Level */}
                    <div className="space-y-1.5 max-w-[calc(50%-0.5rem)]">
                      <Label className="inline-flex items-center gap-1">Official Level <FieldTooltip fieldKey="officialCefrLevel" /></Label>
                      {officialCefrLevel && editingCefrField !== 'officialCefrLevel' ? (
                        <button
                          type="button"
                          onClick={() => setEditingCefrField('officialCefrLevel')}
                          className="block"
                          aria-label="Edit Official Level"
                          data-testid="student-official-cefr-badge"
                        >
                          <CefrBadge level={officialCefrLevel} className="cursor-pointer hover:opacity-80 transition-opacity" />
                        </button>
                      ) : (
                        <Select
                          value={officialCefrLevel}
                          onValueChange={(v) => { setOfficialCefrLevel(!v || v === '__none__' ? '' : v); setEditingCefrField(null) }}
                          open={editingCefrField === 'officialCefrLevel' || undefined}
                          onOpenChange={(open) => { if (!open) setEditingCefrField(null) }}
                        >
                          <SelectTrigger data-testid="student-official-cefr">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {CEFR_LEVELS.map((level) => (
                              <SelectItem key={level} value={level}>{level}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <p className="text-xs text-zinc-400">Official exam result or external assessment.</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Languages card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Languages</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Native Languages */}
                    <div className="space-y-1.5">
                      <Label className="inline-flex items-center gap-1">Native Languages <FieldTooltip fieldKey="nativeLanguages" /></Label>
                      <MultiSelect
                        options={NATIVE_LANGUAGE_OPTIONS}
                        selected={nativeLanguages}
                        onChange={setNativeLanguages}
                        placeholder="Select native languages (optional)"
                        triggerId="student-native-language"
                        chipTestId="native-lang-chip"
                        maxItems={5}
                        allowCustom={false}
                      />
                    </div>

                    {/* Spoken Languages */}
                    <div className="space-y-1.5">
                      <Label className="inline-flex items-center gap-1">Spoken Languages <FieldTooltip fieldKey="spokenLanguages" /></Label>
                      <div
                        className="flex flex-wrap gap-1.5 min-h-10 w-full max-w-sm rounded-md border border-input bg-white px-3 py-2 cursor-text"
                        onClick={() => spokenInputRef.current?.focus()}
                        data-testid="spoken-languages-container"
                      >
                        {spokenLanguages.map((lang) => (
                          <span
                            key={lang}
                            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full px-2.5 py-0.5"
                            data-testid="spoken-lang-chip"
                          >
                            {lang}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeSpokenLanguage(lang) }}
                              className="text-indigo-400 hover:text-indigo-700 p-0.5 -mr-0.5"
                              aria-label={`Remove ${lang}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </span>
                        ))}
                        <input
                          ref={spokenInputRef}
                          value={spokenInput}
                          onChange={(e) => setSpokenInput(e.target.value)}
                          onKeyDown={handleSpokenKeyDown}
                          onBlur={() => { if (spokenInput.trim()) addSpokenLanguage(spokenInput) }}
                          placeholder={spokenLanguages.length === 0 ? 'Type and press Enter' : ''}
                          className="flex-1 min-w-20 outline-none text-sm bg-transparent placeholder:text-zinc-400"
                          data-testid="spoken-language-input"
                        />
                      </div>
                      <p className="text-xs text-zinc-400">Other languages spoken. Flat list, no proficiency level.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Skill Overrides — below the 2-column grid, placed in right column position */}
            <div id="section-proficiency" className="grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-6">
              <div /> {/* empty left column to push Skill Overrides to the right */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base inline-flex items-center gap-1">Skill Overrides <FieldTooltip fieldKey="skillLevelOverrides" /></CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-zinc-400 mb-4">Override the general CEFR level per skill for AI generation. Leave empty to inherit the general level.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Reading', 'Writing', 'Speaking', 'Listening'] as const).map((skill) => (
                      <div key={skill} className="space-y-1.5">
                        <Label className="text-xs">{skill}</Label>
                        {skillLevelOverrides[skill] && editingCefrField !== `skill-${skill}` ? (
                          <button
                            type="button"
                            onClick={() => setEditingCefrField(`skill-${skill}`)}
                            className="block"
                            aria-label={`Edit ${skill} override`}
                            data-testid={`skill-override-${skill.toLowerCase()}-badge`}
                          >
                            <CefrBadge level={skillLevelOverrides[skill]} className="cursor-pointer hover:opacity-80 transition-opacity" />
                          </button>
                        ) : (
                          <Select
                            value={skillLevelOverrides[skill] ?? ''}
                            onValueChange={(v) => { setSkillOverride(skill, !v || v === '__none__' ? '' : v); setEditingCefrField(null) }}
                            open={editingCefrField === `skill-${skill}` || undefined}
                            onOpenChange={(open) => { if (!open) setEditingCefrField(null) }}
                          >
                            <SelectTrigger data-testid={`skill-override-${skill.toLowerCase()}`} className="h-8 text-xs">
                              <SelectValue placeholder="--" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">--</SelectItem>
                              {CEFR_LEVELS.map((level) => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── SECTION: Personal Background ── */}
            <div id="section-background" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personal Background</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
                    <div className="space-y-1.5">
                      <Label htmlFor="birth-year">Birth Year</Label>
                      <Input
                        id="birth-year"
                        type="number"
                        value={birthYear ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value
                          const num = Number(raw)
                          setBirthYear(raw && !isNaN(num) && Number.isInteger(num) ? num : null)
                        }}
                        placeholder="e.g. 1990"
                        min={1900}
                        max={new Date().getFullYear()}
                        data-testid="student-birth-year"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="profession">Profession</Label>
                      <Input
                        id="profession"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        placeholder="e.g. Software engineer"
                        maxLength={128}
                        data-testid="student-profession"
                      />
                    </div>
                  </div>

                  {/* Origin */}
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-2">Origin</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
                      <div className="space-y-1.5">
                        <Label htmlFor="country-origin">Country</Label>
                        <Input
                          id="country-origin"
                          value={countryOfOrigin}
                          onChange={(e) => setCountryOfOrigin(e.target.value)}
                          placeholder="e.g. Portugal"
                          maxLength={64}
                          data-testid="student-country-origin"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="city-origin">City</Label>
                        <Input
                          id="city-origin"
                          value={cityOfOrigin}
                          onChange={(e) => setCityOfOrigin(e.target.value)}
                          placeholder="e.g. Lisbon"
                          maxLength={64}
                          data-testid="student-city-origin"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Residence */}
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-2">Residence</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
                      <div className="space-y-1.5">
                        <Label htmlFor="country-residence">Country</Label>
                        <Input
                          id="country-residence"
                          value={countryOfResidence}
                          onChange={(e) => setCountryOfResidence(e.target.value)}
                          placeholder="e.g. Spain"
                          maxLength={64}
                          data-testid="student-country-residence"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="city-residence">City</Label>
                        <Input
                          id="city-residence"
                          value={cityOfResidence}
                          onChange={(e) => setCityOfResidence(e.target.value)}
                          placeholder="e.g. Madrid"
                          maxLength={64}
                          data-testid="student-city-residence"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Reason for Studying</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
                    <span
                      className="text-6xl leading-none text-indigo-200 select-none font-manrope"
                      aria-hidden="true"
                    >
                      &ldquo;
                    </span>
                    <div className="space-y-1.5">
                      <Textarea
                        id="reason-for-studying"
                        value={reasonForStudying}
                        onChange={(e) => setReasonForStudying(e.target.value)}
                        placeholder="e.g. Moving to Spain next year, loves the culture..."
                        maxLength={512}
                        rows={3}
                        className="resize-none w-full italic text-[#1A1B22]"
                        data-testid="student-reason-for-studying"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base inline-flex items-center gap-1">Interests <FieldTooltip fieldKey="interests" /></CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div
                    className="flex flex-wrap gap-1.5 min-h-10 w-full max-w-sm rounded-md border border-zinc-200 bg-white px-3 py-2 cursor-text"
                    onClick={() => interestInputRef.current?.focus()}
                  >
                    {interests.map((interest) => (
                      <span
                        key={interest}
                        className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full px-2.5 py-0.5"
                        data-testid="interest-chip"
                      >
                        {interest}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeInterest(interest) }}
                          className="text-indigo-400 hover:text-indigo-700 p-0.5 -mr-0.5"
                          aria-label={`Remove ${interest}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                    <input
                      ref={interestInputRef}
                      value={interestInput}
                      onChange={(e) => setInterestInput(e.target.value)}
                      onKeyDown={handleInterestKeyDown}
                      onBlur={() => { if (interestInput.trim()) addInterest(interestInput) }}
                      placeholder={interests.length === 0 ? 'Type and press Enter' : ''}
                      className="flex-1 min-w-20 outline-none text-sm bg-transparent placeholder:text-zinc-400"
                      data-testid="interest-input"
                    />
                  </div>
                  <p className="text-xs text-zinc-400">Press Enter or comma to add. Backspace to remove last.</p>
                </CardContent>
              </Card>
            </div>

            {/* ── SECTION: Teaching Goals (Learning Goals + Short-Term Objectives) ── */}
            <div id="section-teaching-goals">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Teaching Goals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Learning Goals */}
                  <div className="space-y-1.5">
                    <Label className="inline-flex items-center gap-1">Learning Goals <FieldTooltip fieldKey="learningGoals" /></Label>
                    <LearningGoalTreeEditor
                      value={learningGoals}
                      onChange={setLearningGoals}
                    />
                  </div>

                  {/* Short-Term Objectives */}
                  <div className="space-y-3 pt-2 border-t border-zinc-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Short-Term Objectives</Label>
                        <p className="text-xs text-zinc-400 mt-0.5">Specific goals with optional target dates (max 10).</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addObjective}
                        disabled={shortTermObjectives.length >= 10}
                        data-testid="add-objective"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Objective
                      </Button>
                    </div>

                    {shortTermObjectives.map((obj) => {
                      const urgency = getObjectiveUrgency(obj.targetDate)
                      return (
                        <div
                          key={obj.id}
                          className="flex flex-col sm:flex-row gap-2 sm:items-start border-l-4 border-orange-300 pl-3 rounded-r-lg bg-orange-50/30"
                          data-testid="objective-row"
                        >
                          <Input
                            value={obj.text}
                            onChange={(e) => updateObjective(obj.id, 'text', e.target.value)}
                            placeholder="e.g. Pass DELE B1 exam"
                            maxLength={500}
                            className="flex-1"
                            data-testid="objective-text-input"
                          />
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden="true" />
                            <input
                              type="date"
                              value={obj.targetDate ?? ''}
                              onChange={(e) => updateObjective(obj.id, 'targetDate', e.target.value || null)}
                              className="h-9 rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm text-[#1A1B22] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                              data-testid="objective-date-input"
                            />
                            {urgency === 'critical' && obj.targetDate && (
                              <span className="text-xs font-semibold text-orange-600 shrink-0" data-testid="objective-near-date-warning">
                                NEAR DATE
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeObjective(obj.id)}
                            className="text-zinc-400 hover:text-red-600 h-9 w-9 shrink-0"
                            data-testid="remove-objective"
                            aria-label="Remove objective"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}

                    {shortTermObjectives.length === 0 && (
                      <p className="text-xs text-zinc-400 italic" data-testid="objectives-empty">
                        No short-term objectives added yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── SECTION: Difficulties (Weaknesses + Structured Difficulties) ── */}
            <div id="section-difficulties">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Difficulties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Weaknesses */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="inline-flex items-center gap-1">Areas to Improve <FieldTooltip fieldKey="weaknesses" /></Label>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Free-text description with category (grammatical, lexical, orthographic).
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addWeakness}
                        data-testid="add-weakness"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </div>

                    {weaknesses.map((w, i) => (
                      <div
                        key={i}
                        className="flex flex-col sm:flex-row gap-2 sm:items-start"
                        data-testid="weakness-row"
                      >
                        <Input
                          value={w.description}
                          onChange={(e) => updateWeakness(i, 'description', e.target.value)}
                          placeholder="e.g. Confuses ser/estar"
                          maxLength={200}
                          className="flex-1"
                          data-testid="weakness-description"
                        />
                        <Select
                          value={w.weaknessType}
                          onValueChange={(v) => v && updateWeakness(i, 'weaknessType', v)}
                        >
                          <SelectTrigger data-testid="weakness-type" className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="grammatical">Grammatical</SelectItem>
                            <SelectItem value="lexical">Lexical</SelectItem>
                            <SelectItem value="orthographic">Orthographic</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeWeakness(i)}
                          className="text-zinc-400 hover:text-red-600 h-9 w-9"
                          data-testid="remove-weakness"
                          aria-label="Remove weakness"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {weaknesses.length === 0 && (
                      <p className="text-xs text-zinc-400 italic" data-testid="weaknesses-empty">
                        No areas to improve tracked yet.
                      </p>
                    )}
                  </div>

                  {/* Structured Difficulties */}
                  <div className="space-y-3 pt-2 border-t border-zinc-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="inline-flex items-center gap-1">Specific Difficulties <FieldTooltip fieldKey="difficulties" /></Label>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Track granular issues for targeted exercise generation.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addDifficulty}
                        data-testid="add-difficulty"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </div>

                    {difficulties.map((d) => (
                      <div key={d.id} className="space-y-1">
                      <div
                        className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_auto_1fr_auto_auto] sm:gap-2 sm:items-start"
                        data-testid="difficulty-row"
                      >
                        <Input
                          value={d.description}
                          onChange={(e) => updateDifficulty(d.id, 'description', e.target.value)}
                          placeholder="e.g. Confuses ser/estar in past tense"
                          maxLength={500}
                          className="sm:col-span-1"
                          data-testid="difficulty-description"
                        />

                        <Select value={d.competency || undefined} onValueChange={(v) => v && updateDifficulty(d.id, 'competency', v)}>
                          <SelectTrigger data-testid="difficulty-competency" className="w-[140px]">
                            <SelectValue placeholder="Competency" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMPETENCY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          value={d.subcategory}
                          onChange={(e) => updateDifficulty(d.id, 'subcategory', e.target.value)}
                          placeholder="Subcategory (e.g. ser/estar)"
                          maxLength={200}
                          data-testid="difficulty-subcategory"
                        />

                        <Button
                          type="button"
                          variant={d.status === 'Covered' ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => updateDifficulty(d.id, 'status', d.status === 'Covered' ? 'Active' : 'Covered')}
                          data-testid="difficulty-status"
                          className="whitespace-nowrap"
                        >
                          {d.status === 'Covered' ? 'Covered' : 'Active'}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDifficulty(d.id)}
                          className="text-zinc-400 hover:text-red-600 h-9 w-9"
                          data-testid="remove-difficulty"
                          aria-label="Remove difficulty"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* Severity bar + trend indicator */}
                      {(d.severity || d.trend) && (
                        <div className="flex items-center gap-3 pl-1" data-testid="difficulty-visual-indicators">
                          {d.severity && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-zinc-400">Severity</span>
                              <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    d.severity === 'high' ? 'bg-red-500 w-full' :
                                    d.severity === 'medium' ? 'bg-amber-500 w-2/3' :
                                    'bg-green-500 w-1/3'
                                  }`}
                                  data-testid="difficulty-severity-bar"
                                />
                              </div>
                            </div>
                          )}
                          {d.trend && (
                            <div className="flex items-center gap-1" data-testid="difficulty-trend-indicator">
                              {d.trend === 'improving' && <TrendingUp className="h-3.5 w-3.5 text-green-500" />}
                              {d.trend === 'worsening' && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                              {d.trend === 'stable' && <Minus className="h-3.5 w-3.5 text-zinc-400" />}
                              <span className="text-xs text-zinc-400 capitalize">{d.trend}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {errors[`difficulty-${d.id}`] && (
                        <p className="text-xs text-red-600" data-testid="difficulty-error">
                          {errors[`difficulty-${d.id}`]}
                        </p>
                      )}
                      </div>
                    ))}

                    {difficulties.length === 0 && (
                      <p className="text-xs text-zinc-400 italic">
                        No specific difficulties tracked yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── SECTION: Notes (2-column) ── */}
            <div id="section-notes">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="inline-flex items-center gap-1">Personal notes <FieldTooltip fieldKey="personalNotes" /></Label>
                      <p className="text-xs text-zinc-400">Sensitivities / life context.</p>
                      <Textarea
                        value={personalNotes}
                        onChange={(e) => setPersonalNotes(e.target.value)}
                        placeholder="Optional personal notes..."
                        maxLength={2000}
                        rows={5}
                        className="resize-none w-full"
                        data-testid="student-personal-notes"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="inline-flex items-center gap-1">Teaching notes <FieldTooltip fieldKey="teachingNotes" /></Label>
                      <p className="text-xs text-zinc-400">Learning style, teaching observations.</p>
                      <Textarea
                        value={teachingNotes}
                        onChange={(e) => setTeachingNotes(e.target.value)}
                        placeholder="Optional teaching notes..."
                        maxLength={2000}
                        rows={5}
                        className="resize-none w-full"
                        data-testid="student-teaching-notes"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── SECTION: Commercial Info (edit only) ── */}
            {isEdit && (
              <div id="section-commercial">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Commercial Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* IsActive toggle */}
                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium cursor-pointer" htmlFor="toggle-is-active">Account Status</Label>
                        <p className="text-xs text-zinc-400 mt-0.5">{isActive ? 'Active' : 'Inactive'}</p>
                      </div>
                      <button
                        id="toggle-is-active"
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        onClick={() => setIsActive(!isActive)}
                        data-testid="toggle-is-active"
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${isActive ? 'bg-indigo-600' : 'bg-zinc-300'}`}
                        aria-label="Toggle active status"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>

                    {/* IsCorporate toggle */}
                    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium cursor-pointer" htmlFor="toggle-is-corporate">Student Type</Label>
                        <p className="text-xs text-zinc-400 mt-0.5">{isCorporate ? 'Corporate' : 'Private'}</p>
                      </div>
                      <button
                        id="toggle-is-corporate"
                        type="button"
                        role="switch"
                        aria-checked={isCorporate}
                        onClick={() => setIsCorporate(!isCorporate)}
                        data-testid="toggle-is-corporate"
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${isCorporate ? 'bg-indigo-600' : 'bg-zinc-300'}`}
                        aria-label="Toggle corporate status"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isCorporate ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>

                    {/* Rate */}
                    <div className="space-y-1.5">
                      <Label htmlFor="rate">Hourly Rate</Label>
                      <Input
                        id="rate"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        placeholder="e.g. 45/hr"
                        maxLength={50}
                        className="max-w-[200px]"
                        data-testid="student-rate"
                      />
                      <p className="text-xs text-zinc-400">Free text. No billing frequency tracked.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </form>

          {isEdit && id && <StudentCoursesCard studentId={id} />}

          {/* Danger zone — delete action at bottom of page */}
          {isEdit && id && (
            <div className="pt-6 border-t border-zinc-100 space-y-2" data-testid="danger-zone">
              {deleteError && (
                <p className="text-sm text-red-600 font-medium" data-testid="delete-error">{deleteError}</p>
              )}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isBusy}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm px-0"
                data-testid="delete-student-btn"
              >
                Delete this student
              </Button>
            </div>
          )}
        </div>

        {isEdit && id && (
          <div className="space-y-4 lg:sticky lg:top-6" data-testid="form-sidebar">
            <div
              className="bg-white rounded-2xl p-4"
              style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
              data-testid="sidebar-teaching-todos"
            >
              <SectionHeader>Teaching Todos</SectionHeader>
              <TeachingTodosCard
                todos={sidebarTodos}
                studentId={id}
                onStudentChange={onSidebarTodoChange}
                allowEdit
              />
            </div>
            <div
              className="bg-white rounded-2xl p-4"
              style={{ boxShadow: '0 12px 40px rgba(26, 27, 34, 0.06)' }}
            >
              <StudentFollowupsCard
                followups={followups}
                studentId={id}
                onFollowupChange={() => refetchFollowups()}
              />
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {isEdit && id && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this student?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this student profile. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => doDelete(id)}
                disabled={isBusy}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-testid="confirm-delete"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
