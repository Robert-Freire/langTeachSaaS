import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OnboardingStep3 from './OnboardingStep3'

vi.mock('../../api/lessons', async () => {
  const actual = await vi.importActual('../../api/lessons')
  return { ...actual, createLesson: vi.fn() }
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

const mockStudent = {
  id: 'stu-1',
  name: 'Ana Garcia',
  learningLanguage: 'Spanish',
  cefrLevel: 'B1',
  interests: [],
  notes: null,
  nativeLanguage: null,
  learningGoals: [],
  weaknesses: [],
  difficulties: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function renderStep3(props: Partial<React.ComponentProps<typeof OnboardingStep3>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <OnboardingStep3
        student={mockStudent}
        onBack={vi.fn()}
        {...props}
      />
    </QueryClientProvider>
  )
}

describe('OnboardingStep3', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the lesson creation form', () => {
    renderStep3()
    expect(screen.getByTestId('onboarding-step-3')).toBeInTheDocument()
    expect(screen.getByText('Create your first lesson')).toBeInTheDocument()
  })

  it('does not show skip button when onSkip is not provided', () => {
    renderStep3()
    expect(screen.queryByTestId('onboarding-skip')).not.toBeInTheDocument()
  })

  it('shows skip button when onSkip prop is provided', () => {
    renderStep3({ onSkip: vi.fn() })
    expect(screen.getByTestId('onboarding-skip')).toBeInTheDocument()
    expect(screen.getByText("Skip, I'll do this later")).toBeInTheDocument()
  })

  it('calls onSkip when skip button is clicked', async () => {
    const onSkip = vi.fn()
    renderStep3({ onSkip })
    const user = userEvent.setup()
    await user.click(screen.getByTestId('onboarding-skip'))
    expect(onSkip).toHaveBeenCalledOnce()
  })
})
