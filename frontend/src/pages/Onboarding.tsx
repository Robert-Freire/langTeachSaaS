import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useProfile, useCompleteOnboarding } from '../hooks/useProfile'
import { getStudents, type Student } from '../api/students'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import OnboardingStep1 from './onboarding/OnboardingStep1'
import OnboardingStep2 from './onboarding/OnboardingStep2'
import OnboardingStep3 from './onboarding/OnboardingStep3'

const STEPS = ['Profile', 'Student', 'Lesson'] as const

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2" data-testid="step-indicator">
      {STEPS.map((label, i) => {
        const stepNum = i + 1
        const isActive = stepNum === current
        const isCompleted = stepNum < current
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`h-px w-8 ${isCompleted ? 'bg-indigo-600' : 'bg-zinc-200'}`} />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : isCompleted
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-zinc-100 text-zinc-400'
                }`}
                data-testid={`step-${stepNum}`}
              >
                {isCompleted ? '\u2713' : stepNum}
              </div>
              <span className={`text-sm ${isActive ? 'font-medium text-zinc-900' : 'text-zinc-400'}`}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function deriveInitialStep(profile: { hasSettings: boolean; hasStudents: boolean; hasLessons: boolean } | undefined): number {
  if (!profile) return 1
  if (!profile.hasSettings) return 1
  if (!profile.hasStudents) return 2
  if (!profile.hasLessons) return 3
  return 1
}

export default function Onboarding() {
  const { data: profile, isLoading } = useProfile()
  const navigate = useNavigate()
  const { mutateAsync: completeOnboarding } = useCompleteOnboarding()
  const [step, setStep] = useState(1)
  const [createdStudent, setCreatedStudent] = useState<Student | null>(null)
  const [initialized, setInitialized] = useState(false)

  const initialStep = !isLoading && profile ? deriveInitialStep(profile) : 1

  // Fetch existing students when resuming at step 3 (user completed step 2 in a previous session)
  const { data: studentsData } = useQuery({
    queryKey: ['students', { pageSize: 1 }],
    queryFn: () => getStudents({ pageSize: 1 }),
    enabled: initialStep === 3 && !createdStudent,
  })

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isLoading && profile && !initialized) {
      setStep(initialStep)
      setInitialized(true)
    }
  }, [isLoading, profile, initialized, initialStep])

  // When resuming at step 3, use the fetched student
  useEffect(() => {
    if (step === 3 && !createdStudent && studentsData?.items?.length) {
      setCreatedStudent(studentsData.items[0])
    }
  }, [step, createdStudent, studentsData])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Card className="w-full max-w-lg">
          <CardContent className="py-8 px-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-12" data-testid="onboarding-wizard">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Welcome to LangTeach</h1>
        <p className="text-sm text-zinc-500 mt-1">Let's get you set up in a few quick steps.</p>
      </div>

      <StepIndicator current={step} />

      <Card className="mt-6 w-full max-w-lg">
        <CardContent className="py-8 px-6">
          {step === 1 && (
            <OnboardingStep1 onNext={() => {
              completeOnboarding().catch(() => {
                // Profile setup succeeded; onboarding flag will be retried on next visit.
                // Don't block step 2 for a non-critical side effect.
              })
              setStep(2)
            }} />
          )}
          {step === 2 && (
            <OnboardingStep2
              onNext={(student) => {
                setCreatedStudent(student)
                setStep(3)
              }}
              onBack={() => setStep(1)}
              onSkip={() => navigate('/')}
            />
          )}
          {step === 3 && createdStudent && (
            <OnboardingStep3
              student={createdStudent}
              onBack={() => setStep(2)}
              onSkip={() => navigate('/')}
            />
          )}
          {step === 3 && !createdStudent && (
            <div className="space-y-4" data-testid="step3-loading">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
