import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ChevronsUpDown, Check, Plus, Trash2 } from 'lucide-react'
import { getStudent, createStudent, updateStudent, type StudentFormData, type Difficulty } from '../api/students'
import { LEARNING_GOALS, getWeaknessesForLanguage, getLanguageSpecificWeaknessValues, DIFFICULTY_CATEGORIES, SEVERITY_LEVELS, TREND_OPTIONS } from '../lib/studentOptions'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { LessonHistoryCard } from '@/components/student/LessonHistoryCard'
import { PageHeader } from '@/components/PageHeader'

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Other']
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  triggerId,
  chipTestId,
  maxLength,
}: {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder: string
  triggerId: string
  chipTestId: string
  maxLength?: number
}) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    )
  }

  function remove(value: string, e: React.MouseEvent) {
    e.stopPropagation()
    onChange(selected.filter((v) => v !== value))
  }

  function addCustom() {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    const limited = maxLength ? trimmed.slice(0, maxLength) : trimmed
    if (!selected.includes(limited)) {
      onChange([...selected, limited])
    }
    setInputValue('')
  }

  const trimmedInput = inputValue.trim()
  const customValue = maxLength ? trimmedInput.slice(0, maxLength) : trimmedInput
  const matchesPredefined = trimmedInput.length > 0 && options.some(
    (o) => o.label.toLowerCase() === trimmedInput.toLowerCase()
  )
  const alreadySelected = selected.includes(customValue)
  const showAddCustom = trimmedInput.length > 0 && !matchesPredefined && !alreadySelected
  const filteredOptions = options.filter((o) =>
    !trimmedInput || o.label.toLowerCase().includes(trimmedInput.toLowerCase())
  )

  return (
    <div className="relative z-[1] space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          data-testid={triggerId}
          className="flex w-full max-w-sm items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50"
        >
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-64 max-w-[calc(100vw-2rem)] p-0 z-[60]" align="start" side="bottom">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or type custom..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              {!showAddCustom && filteredOptions.length === 0 && (
                <CommandEmpty>No options found.</CommandEmpty>
              )}
              <CommandGroup>
                {filteredOptions.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={opt.value}
                      onSelect={() => toggle(opt.value)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selected.includes(opt.value) ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {opt.label}
                    </CommandItem>
                  ))}
              </CommandGroup>
              {showAddCustom && (
                <CommandGroup>
                  <CommandItem
                    value={`custom:${trimmedInput}`}
                    onSelect={addCustom}
                    data-testid="add-custom-entry"
                  >
                    <Plus className="mr-2 h-4 w-4 text-indigo-500" />
                    Add &ldquo;{trimmedInput}&rdquo;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {selected.map((value) => {
            const label = options.find((o) => o.value === value)?.label ?? value
            return (
              <span
                key={value}
                className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded px-2 py-0.5"
                data-testid={chipTestId}
              >
                {label}
                <button
                  type="button"
                  onClick={(e) => remove(value, e)}
                  className="text-indigo-400 hover:text-indigo-700 p-0.5 -mr-0.5"
                  aria-label={`Remove ${label}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
  const [nativeLanguage, setNativeLanguage] = useState<string>('')
  const [learningGoals, setLearningGoals] = useState<string[]>([])
  const [weaknesses, setWeaknesses] = useState<string[]>([])
  const [difficulties, setDifficulties] = useState<Difficulty[]>([])
  const [notes, setNotes] = useState('')
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
      setNativeLanguage(existing.nativeLanguage ?? '')
      setLearningGoals(existing.learningGoals)
      setWeaknesses(existing.weaknesses)
      setDifficulties(existing.difficulties ?? [])
      setNotes(existing.notes ?? '')
    }
  }, [existing])
  /* eslint-enable react-hooks/set-state-in-effect */

  const { mutate, isPending } = useMutation({
    mutationFn: (data: StudentFormData) =>
      isEdit ? updateStudent(id!, data) : createStudent(data),
    onSuccess: () => {
      logger.info('StudentForm', isEdit ? 'student updated' : 'student created')
      queryClient.invalidateQueries({ queryKey: ['students'] })
      navigate('/students')
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

  function addDifficulty() {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    setDifficulties((prev) => [
      ...prev,
      { id, category: '', item: '', severity: '', trend: '' },
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
      (d) => d.category && d.item.trim() && d.severity && d.trend
    )
    mutate({
      name: name.trim(),
      learningLanguage: language,
      cefrLevel,
      interests: finalInterests,
      nativeLanguage: nativeLanguage || null,
      learningGoals,
      weaknesses,
      difficulties: validDifficulties,
      notes: notes.trim() || undefined,
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
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
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
                <Label>Learning Language <span className="text-red-500">*</span></Label>
                <Select value={language} onValueChange={(v) => {
                  if (!v) return
                  const stale = getLanguageSpecificWeaknessValues(language)
                  setWeaknesses((prev) => prev.filter((w) => !stale.has(w)))
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
                <Label>CEFR Level <span className="text-red-500">*</span></Label>
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
            <CardTitle className="text-base">Interests</CardTitle>
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
            <CardTitle className="text-base">AI Personalization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-zinc-400 -mt-1">
              Used to personalize AI-generated lesson content for this student.
            </p>

            {/* Native Language */}
            <div className="space-y-1.5">
              <Label>Native Language</Label>
              <Select value={nativeLanguage || 'none'} onValueChange={(v) => setNativeLanguage(v === 'none' ? '' : (v ?? ''))}>
                <SelectTrigger className="max-w-sm" data-testid="student-native-language">
                  <SelectValue placeholder="Select native language (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Learning Goals */}
            <div className="space-y-1.5">
              <Label>Learning Goals</Label>
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
            <div className="space-y-1.5">
              <Label>Areas to Improve</Label>
              <MultiSelect
                options={getWeaknessesForLanguage(language)}
                selected={weaknesses}
                onChange={setWeaknesses}
                placeholder="Select or type areas..."
                triggerId="weaknesses-trigger"
                chipTestId="weakness-chip"
                maxLength={200}
              />
            </div>

            {/* Structured Difficulties */}
            <div className="space-y-3 pt-2 border-t border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Specific Difficulties</Label>
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
                  className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_2fr_1fr_1fr_auto] sm:gap-2 sm:items-start"
                  data-testid="difficulty-row"
                >
                  <Input
                    value={d.item}
                    onChange={(e) => updateDifficulty(d.id, 'item', e.target.value)}
                    placeholder="e.g. ser/estar in past tense"
                    maxLength={200}
                    className="sm:order-2"
                    data-testid="difficulty-item"
                  />

                  <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 sm:contents">
                    <Select value={d.category || undefined} onValueChange={(v) => v && updateDifficulty(d.id, 'category', v)}>
                      <SelectTrigger data-testid="difficulty-category" className="sm:order-1">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {DIFFICULTY_CATEGORIES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={d.severity || undefined} onValueChange={(v) => v && updateDifficulty(d.id, 'severity', v)}>
                      <SelectTrigger data-testid="difficulty-severity" className="sm:order-3">
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITY_LEVELS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={d.trend || undefined} onValueChange={(v) => v && updateDifficulty(d.id, 'trend', v)}>
                      <SelectTrigger data-testid="difficulty-trend" className="sm:order-4">
                        <SelectValue placeholder="Trend" />
                      </SelectTrigger>
                      <SelectContent>
                        {TREND_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDifficulty(d.id)}
                      className="text-zinc-400 hover:text-red-600 h-9 w-9 sm:order-5"
                      data-testid="remove-difficulty"
                      aria-label="Remove difficulty"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this student..."
              maxLength={2000}
              rows={4}
              className="max-w-sm resize-none"
              data-testid="student-notes"
            />
          </CardContent>
        </Card>
      </form>

      {isEdit && id && <LessonHistoryCard studentId={id} />}
    </div>
  )
}
