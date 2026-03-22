import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OnboardingStep2 from './OnboardingStep2'

vi.mock('../../api/students', async () => {
  const actual = await vi.importActual('../../api/students')
  return { ...actual, createStudent: vi.fn() }
})

function renderStep2(props: Partial<React.ComponentProps<typeof OnboardingStep2>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <OnboardingStep2
        onNext={vi.fn()}
        onBack={vi.fn()}
        {...props}
      />
    </QueryClientProvider>
  )
}

describe('OnboardingStep2', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the student creation form', () => {
    renderStep2()
    expect(screen.getByTestId('onboarding-step-2')).toBeInTheDocument()
    expect(screen.getByText('Add your first student')).toBeInTheDocument()
  })

  it('does not show skip button when onSkip is not provided', () => {
    renderStep2()
    expect(screen.queryByTestId('onboarding-skip')).not.toBeInTheDocument()
  })

  it('shows skip button when onSkip prop is provided', () => {
    renderStep2({ onSkip: vi.fn() })
    expect(screen.getByTestId('onboarding-skip')).toBeInTheDocument()
    expect(screen.getByText("Skip, I'll do this later")).toBeInTheDocument()
  })

  it('calls onSkip when skip button is clicked', async () => {
    const onSkip = vi.fn()
    renderStep2({ onSkip })
    const user = userEvent.setup()
    await user.click(screen.getByTestId('onboarding-skip'))
    expect(onSkip).toHaveBeenCalledOnce()
  })
})
