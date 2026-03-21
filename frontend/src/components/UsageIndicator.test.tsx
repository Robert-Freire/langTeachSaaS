import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { UsageIndicator } from './UsageIndicator'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../hooks/useProfile', () => ({
  useProfile: vi.fn(),
}))

import { useProfile } from '../hooks/useProfile'

const mockedUseProfile = vi.mocked(useProfile)

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('UsageIndicator', () => {
  it('renders nothing when profile is not loaded', () => {
    mockedUseProfile.mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useProfile>)
    const { container } = renderWithQuery(<UsageIndicator />)
    expect(container.firstChild).toBeNull()
  })

  it('renders Pro badge for Pro tier', () => {
    mockedUseProfile.mockReturnValue({
      data: {
        id: '1', displayName: 'Test', teachingLanguages: [], cefrLevels: [],
        preferredStyle: '', hasCompletedOnboarding: true, hasSettings: true,
        hasStudents: false, hasLessons: false,
        generationsUsedThisMonth: 100, generationsMonthlyLimit: -1, subscriptionTier: 'Pro',
      },
    } as unknown as ReturnType<typeof useProfile>)
    renderWithQuery(<UsageIndicator />)
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.queryByText(/generations/)).not.toBeInTheDocument()
  })

  it('renders usage count for Free tier', () => {
    mockedUseProfile.mockReturnValue({
      data: {
        id: '1', displayName: 'Test', teachingLanguages: [], cefrLevels: [],
        preferredStyle: '', hasCompletedOnboarding: true, hasSettings: true,
        hasStudents: false, hasLessons: false,
        generationsUsedThisMonth: 10, generationsMonthlyLimit: 50, subscriptionTier: 'Free',
      },
    } as unknown as ReturnType<typeof useProfile>)
    renderWithQuery(<UsageIndicator />)
    expect(screen.getByText('10 / 50 generations')).toBeInTheDocument()
  })

  it('shows exhausted message when at limit', () => {
    mockedUseProfile.mockReturnValue({
      data: {
        id: '1', displayName: 'Test', teachingLanguages: [], cefrLevels: [],
        preferredStyle: '', hasCompletedOnboarding: true, hasSettings: true,
        hasStudents: false, hasLessons: false,
        generationsUsedThisMonth: 50, generationsMonthlyLimit: 50, subscriptionTier: 'Free',
      },
    } as unknown as ReturnType<typeof useProfile>)
    renderWithQuery(<UsageIndicator />)
    expect(screen.getByTestId('usage-exhausted-msg')).toBeInTheDocument()
  })

  it('progress bar has warning color at 80%', () => {
    mockedUseProfile.mockReturnValue({
      data: {
        id: '1', displayName: 'Test', teachingLanguages: [], cefrLevels: [],
        preferredStyle: '', hasCompletedOnboarding: true, hasSettings: true,
        hasStudents: false, hasLessons: false,
        generationsUsedThisMonth: 42, generationsMonthlyLimit: 50, subscriptionTier: 'Free',
      },
    } as unknown as ReturnType<typeof useProfile>)
    renderWithQuery(<UsageIndicator />)
    const bar = screen.getByTestId('usage-progress-bar')
    expect(bar.className).toContain('bg-amber-400')
  })

  it('progress bar has red color when exhausted', () => {
    mockedUseProfile.mockReturnValue({
      data: {
        id: '1', displayName: 'Test', teachingLanguages: [], cefrLevels: [],
        preferredStyle: '', hasCompletedOnboarding: true, hasSettings: true,
        hasStudents: false, hasLessons: false,
        generationsUsedThisMonth: 50, generationsMonthlyLimit: 50, subscriptionTier: 'Free',
      },
    } as unknown as ReturnType<typeof useProfile>)
    renderWithQuery(<UsageIndicator />)
    const bar = screen.getByTestId('usage-progress-bar')
    expect(bar.className).toContain('bg-red-500')
  })
})
