import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createLesson } from '../../api/lessons'
import { useCompleteOnboarding } from '../../hooks/useProfile'
import { type Student } from '../../api/students'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface OnboardingStep3Props {
  student: Student
  onBack: () => void
}

export default function OnboardingStep3({ student, onBack }: OnboardingStep3Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { mutateAsync: completeOnboarding } = useCompleteOnboarding()

  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: createLesson,
    onSuccess: async (lesson) => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      try {
        await completeOnboarding()
      } catch {
        // Lesson was created successfully; onboarding flag will be retried on next visit.
        // Don't block navigation for a non-critical side effect.
      }
      navigate(`/lessons/${lesson.id}`)
    },
    onError: () => setError('Failed to create lesson. Please try again.'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Please enter a lesson title.')
      return
    }
    if (!topic.trim()) {
      setError('Please enter a topic.')
      return
    }

    mutate({
      title: title.trim(),
      topic: topic.trim(),
      language: student.learningLanguage,
      cefrLevel: student.cefrLevel,
      durationMinutes: 60,
      studentId: student.id,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="onboarding-step-3">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Create your first lesson</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Set up a lesson for {student.name}. You can generate content in the lesson editor.
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <Badge variant="outline" className="border-zinc-200">{student.learningLanguage}</Badge>
        <Badge variant="outline" className="border-zinc-200">{student.cefrLevel}</Badge>
        <span>for {student.name}</span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lessonTitle">Lesson title</Label>
        <Input
          id="lessonTitle"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={200}
          placeholder="e.g. Past Tenses Review"
          className="max-w-sm"
          data-testid="onboarding-lesson-title"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lessonTopic">Topic</Label>
        <Input
          id="lessonTopic"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          maxLength={200}
          placeholder="e.g. Travel stories and experiences"
          className="max-w-sm"
          data-testid="onboarding-lesson-topic"
        />
      </div>

      {error && <p className="text-sm text-red-600" data-testid="step3-error">{error}</p>}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={isPending} data-testid="onboarding-back">
          Back
        </Button>
        <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700" data-testid="onboarding-next">
          {isPending ? 'Creating...' : 'Finish & Open Lesson'}
        </Button>
      </div>
    </form>
  )
}
