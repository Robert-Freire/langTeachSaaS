import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ChevronsUpDown, Check } from 'lucide-react'
import { getStudent, createStudent, updateStudent, type StudentFormData } from '../api/students'
import { LEARNING_GOALS, WEAKNESSES } from '../lib/studentOptions'
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

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Other']
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  triggerId,
  chipTestId,
}: {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder: string
  triggerId: string
  chipTestId: string
}) {
  const [open, setOpen] = useState(false)

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

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          data-testid={triggerId}
          className="flex w-full max-w-sm items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50"
        >
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
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
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
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
                  className="text-indigo-400 hover:text-indigo-700"
                  aria-label={`Remove ${label}`}
                >
                  <X className="h-3 w-3" />
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
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const interestInputRef = useRef<HTMLInputElement>(null)

  const { data: existing, isLoading } = useQuery({
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
    mutate({
      name: name.trim(),
      learningLanguage: language,
      cefrLevel,
      interests: finalInterests,
      nativeLanguage: nativeLanguage || null,
      learningGoals,
      weaknesses,
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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          {isEdit ? 'Edit Student' : 'Add Student'}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {isEdit ? "Update this student's profile." : 'Create a new student profile.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
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
                    className="text-indigo-400 hover:text-indigo-700"
                    aria-label={`Remove ${interest}`}
                  >
                    <X className="h-3 w-3" />
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
                placeholder="Select goals..."
                triggerId="learning-goals-trigger"
                chipTestId="learning-goal-chip"
              />
            </div>

            {/* Weaknesses */}
            <div className="space-y-1.5">
              <Label>Areas to Improve</Label>
              <MultiSelect
                options={WEAKNESSES}
                selected={weaknesses}
                onChange={setWeaknesses}
                placeholder="Select areas..."
                triggerId="weaknesses-trigger"
                chipTestId="weakness-chip"
              />
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
            <div className="flex justify-end items-center gap-3 pt-2 border-t border-zinc-100">
              <Button type="button" variant="outline" onClick={() => navigate('/students')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isPending ? 'Saving...' : isEdit ? 'Update Student' : 'Save Student'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {isEdit && id && <LessonHistoryCard studentId={id} />}
    </div>
  )
}
