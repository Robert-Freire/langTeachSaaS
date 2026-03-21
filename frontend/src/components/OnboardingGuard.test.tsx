import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OnboardingGuard } from './OnboardingGuard'

vi.mock('../hooks/useProfile', () => ({
  useProfile: vi.fn(),
}))

import { useProfile } from '../hooks/useProfile'

function renderWithRouter(initialRoute = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route element={<OnboardingGuard />}>
            <Route path="/" element={<div data-testid="dashboard">Dashboard</div>} />
          </Route>
          <Route path="/onboarding" element={<div data-testid="onboarding-page">Onboarding</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('OnboardingGuard', () => {
  beforeEach(() => {
    vi.mocked(useProfile).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)
  })

  it('shows loading state while profile is loading', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    renderWithRouter()
    expect(screen.getByTestId('onboarding-guard-loading')).toBeInTheDocument()
  })

  it('redirects to /onboarding when hasCompletedOnboarding is false', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: {
        id: '1',
        displayName: 'Test',
        teachingLanguages: [],
        cefrLevels: [],
        preferredStyle: 'Conversational',
        hasCompletedOnboarding: false,
        hasSettings: false,
        hasStudents: false,
        hasLessons: false,
      },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    renderWithRouter()
    expect(screen.getByTestId('onboarding-page')).toBeInTheDocument()
  })

  it('renders children when hasCompletedOnboarding is true', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: {
        id: '1',
        displayName: 'Test',
        teachingLanguages: ['English'],
        cefrLevels: ['B1'],
        preferredStyle: 'Conversational',
        hasCompletedOnboarding: true,
        hasSettings: true,
        hasStudents: true,
        hasLessons: true,
      },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    renderWithRouter()
    expect(screen.getByTestId('dashboard')).toBeInTheDocument()
  })
})
