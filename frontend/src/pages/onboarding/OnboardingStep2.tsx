import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createStudent, type Student } from '../../api/students'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CEFR_LEVELS } from '@/lib/cefr-colors'
import { LANGUAGES, NATIVE_LANGUAGES } from '@/lib/languages'

interface OnboardingStep2Props {
  onNext: (student: Student) => void
  onBack: () => void
  onSkip?: () => void
}

export default function OnboardingStep2({ onNext, onBack, onSkip }: OnboardingStep2Props) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [learningLanguage, setLearningLanguage] = useState('')
  const [cefrLevel, setCefrLevel] = useState('')
  const [nativeLanguage, setNativeLanguage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: createStudent,
    onSuccess: (student: Student) => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      onNext(student)
    },
    onError: () => setError('Failed to create student. Please try again.'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter the student name.')
      return
    }
    if (!learningLanguage) {
      setError('Please select a learning language.')
      return
    }
    if (!cefrLevel) {
      setError('Please select a CEFR level.')
      return
    }

    mutate({
      name: name.trim(),
      learningLanguage,
      cefrLevel,
      interests: [],
      learningGoals: [],
      weaknesses: [],
      difficulties: [],
      nativeLanguage: nativeLanguage || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="onboarding-step-2">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Add your first student</h2>
        <p className="text-sm text-zinc-500 mt-1">Create a student profile to start generating personalized lessons.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="studentName">Student name <span className="text-red-500">*</span></Label>
        <Input
          id="studentName"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={200}
          placeholder="e.g. Ana Garcia"
          className="max-w-sm"
          data-testid="onboarding-student-name"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="learningLanguage">Language they are learning <span className="text-red-500">*</span></Label>
        <Select value={learningLanguage} onValueChange={(v) => setLearningLanguage(v ?? '')}>
          <SelectTrigger className="max-w-sm" id="learningLanguage" data-testid="onboarding-learning-language">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map(lang => (
              <SelectItem key={lang} value={lang}>{lang}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cefrLevel">Current level <span className="text-red-500">*</span></Label>
        <Select value={cefrLevel} onValueChange={(v) => setCefrLevel(v ?? '')}>
          <SelectTrigger className="max-w-sm" id="cefrLevel" data-testid="onboarding-cefr-level">
            <SelectValue placeholder="Select level" />
          </SelectTrigger>
          <SelectContent>
            {CEFR_LEVELS.map(level => (
              <SelectItem key={level} value={level}>{level}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nativeLanguage">Native language (optional)</Label>
        <Select value={nativeLanguage} onValueChange={(v) => setNativeLanguage(v ?? '')}>
          <SelectTrigger className="max-w-sm" id="nativeLanguage" data-testid="onboarding-native-language">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {NATIVE_LANGUAGES.map(lang => (
              <SelectItem key={lang} value={lang}>{lang}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-red-600" data-testid="step2-error">{error}</p>}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={isPending} data-testid="onboarding-back">
          Back
        </Button>
        <div className="flex items-center gap-4">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              disabled={isPending}
              className="text-sm text-zinc-600 hover:text-zinc-800 underline underline-offset-2"
              data-testid="onboarding-skip"
            >
              Skip, I'll do this later
            </button>
          )}
          <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700" data-testid="onboarding-next">
            {isPending ? 'Creating...' : 'Next'}
          </Button>
        </div>
      </div>
    </form>
  )
}
