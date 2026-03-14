import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { getStudent, createStudent, updateStudent, type StudentFormData } from '../api/students'
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

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Mandarin', 'Japanese', 'Arabic', 'Other']
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

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
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const interestInputRef = useRef<HTMLInputElement>(null)

  const { data: existing, isLoading } = useQuery({
    queryKey: ['students', id],
    queryFn: () => getStudent(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setLanguage(existing.learningLanguage)
      setCefrLevel(existing.cefrLevel)
      setInterests(existing.interests)
      setNotes(existing.notes ?? '')
    }
  }, [existing])

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
    mutate({ name: name.trim(), learningLanguage: language, cefrLevel, interests: finalInterests, notes: notes.trim() || undefined })
  }

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-zinc-500">
        Loading student...
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
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
              <Label htmlFor="name">Name</Label>
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

            {/* Language */}
            <div className="space-y-1.5">
              <Label>Learning Language</Label>
              <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
                <SelectTrigger className="max-w-sm" data-testid="student-language">
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

            {/* CEFR Level */}
            <div className="space-y-1.5">
              <Label>CEFR Level</Label>
              <Select value={cefrLevel} onValueChange={(v) => v && setCefrLevel(v)}>
                <SelectTrigger className="max-w-sm" data-testid="student-cefr">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Tag input */}
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
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
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

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isPending ? 'Saving...' : isEdit ? 'Update Student' : 'Save Student'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/students')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
