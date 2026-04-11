import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Trash2 } from 'lucide-react'
import { getStudent, createStudent, updateStudent, type StudentFormData, type Difficulty, type StudentWeaknessItem } from '../api/students'
import { LEARNING_GOALS, COMPETENCY_OPTIONS } from '../lib/studentOptions'
import { logger } from '../lib/logger'
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
import { StudentCoursesCard } from '@/components/student/StudentCoursesCard'
import { FieldTooltip } from '@/components/FieldTooltip'
import { PageHeader } from '@/components/PageHeader'
import { CEFR_LEVELS } from '@/lib/cefr-colors'
import { LANGUAGES, NATIVE_LANGUAGE_OPTIONS } from '@/lib/languages'

export default function StudentForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [name, setName] = useState('')
  const [language, setLanguage] = useState('')
  const [cefrLevel, setCefrLevel] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [interestInput, setInterestInput] = useState('')
  const [nativeLanguages, setNativeLanguages] = useState<string[]>([])
  const [learningGoals, setLearningGoals] = useState<string[]>([])
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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const interestInputRef = useRef<HTMLInputElement>(null)

  const { data: existing, isLoading, isError } = useQuery({
    queryKey: ['students', id],
    queryFn: () => getStudent(id!),
    enabled: isEdit,
  })

  // Sync server student data to local form state
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setLanguage(existing.learningLanguage)
      setCefrLevel(existing.cefrLevel)
      setInterests(existing.interests)
      setNativeLanguages(existing.nativeLanguages)
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
    }
  }, [existing])
  /* eslint-enable react-hooks/set-state-in-effect */

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
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    setDifficulties((prev) => [
      ...prev,
      { id, description: '', competency: '', subcategory: '', severity: 'medium', trend: 'stable', status: 'Active' },
    ])
  }

  function updateDifficulty(id: string, field: keyof Difficulty, value: string) {
    setDifficulties((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    )
  }

  function removeDifficulty(id: string) {
    setDifficulties((prev) => prev.filter((d) => d.id !== id))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!language) errs.language = 'Language is required'
    if (!cefrLevel) errs.cefrLevel = 'CEFR level is required'
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
    mutate({
      name: name.trim(),
      learningLanguage: language,
      cefrLevel,
      interests: finalInterests,
      nativeLanguages,
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
    <div className="max-w-2xl space-y-6">
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
                  {/* render as span so pointer events fire even when the inner button is disabled */}
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
            <Button type="button" variant="outline" onClick={() => navigate('/students')}>
              Cancel
            </Button>
            <Button type="submit" form="student-form" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isPending ? 'Saving...' : isEdit ? 'Update Student' : 'Save Student'}
            </Button>
          </div>
        }
      />

      <form id="student-form" onSubmit={handleSubmit} className="space-y-6">
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

            {/* Language + CEFR Level side-by-side */}
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
                <Label className="inline-flex items-center gap-1">CEFR Level <span className="text-red-500">*</span> <FieldTooltip fieldKey="cefrLevel" /></Label>
                <Select value={cefrLevel} onValueChange={(v) => v && setCefrLevel(v)}>
                  <SelectTrigger data-testid="student-cefr">
                    <SelectValue placeholder="Select a level" />
                  </SelectTrigger>
                  <SelectContent>
                    {CEFR_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.cefrLevel && <p className="text-xs text-red-600">{errors.cefrLevel}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
              <div className="space-y-1.5">
                <Label htmlFor="country-origin">Country of Origin</Label>
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
                <Label htmlFor="city-origin">City of Origin</Label>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
              <div className="space-y-1.5">
                <Label htmlFor="country-residence">Country of Residence</Label>
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
                <Label htmlFor="city-residence">City of Residence</Label>
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
                  className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded px-2 py-0.5"
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teaching Context</CardTitle>
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

            {/* Learning Goals */}
            <div className="space-y-1.5">
              <Label className="inline-flex items-center gap-1">Learning Goals <FieldTooltip fieldKey="learningGoals" /></Label>
              <MultiSelect
                options={LEARNING_GOALS}
                selected={learningGoals}
                onChange={setLearningGoals}
                placeholder="Select or type goals..."
                triggerId="learning-goals-trigger"
                chipTestId="learning-goal-chip"
                maxLength={100}
              />
            </div>

            {/* Weaknesses */}
            <div className="space-y-3 pt-2 border-t border-zinc-100">
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
                <div
                  key={d.id}
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
              ))}

              {difficulties.length === 0 && (
                <p className="text-xs text-zinc-400 italic">
                  No specific difficulties tracked yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="inline-flex items-center gap-1">Personal notes <FieldTooltip fieldKey="personalNotes" /></Label>
              <p className="text-xs text-zinc-400">About the student as a person (sensitivities, context, life situation).</p>
              <Textarea
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                placeholder="Optional personal notes..."
                maxLength={2000}
                rows={3}
                className="max-w-sm resize-none"
                data-testid="student-personal-notes"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="inline-flex items-center gap-1">Teaching notes <FieldTooltip fieldKey="teachingNotes" /></Label>
              <p className="text-xs text-zinc-400">How this student learns, what works in class, teaching observations.</p>
              <Textarea
                value={teachingNotes}
                onChange={(e) => setTeachingNotes(e.target.value)}
                placeholder="Optional teaching notes..."
                maxLength={2000}
                rows={3}
                className="max-w-sm resize-none"
                data-testid="student-teaching-notes"
              />
            </div>
          </CardContent>
        </Card>
      </form>

      {isEdit && id && <StudentCoursesCard studentId={id} />}
    </div>
  )
}
