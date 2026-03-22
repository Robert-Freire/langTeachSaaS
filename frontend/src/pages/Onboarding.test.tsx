import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Onboarding from './Onboarding'

const mockUpdateMutate = vi.fn()
const mockCompleteMutateAsync = vi.fn().mockResolvedValue(undefined)

vi.mock('../hooks/useProfile', () => ({
  useProfile: vi.fn(),
  useUpdateProfile: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useCompleteOnboarding: () => ({
    mutateAsync: mockCompleteMutateAsync,
  }),
}))

const mockAuth0User = { name: 'Auth0 User', email: 'test@example.com' }
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    user: mockAuth0User,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

const mockGetStudents = vi.fn()
vi.mock('../api/students', async () => {
  const actual = await vi.importActual('../api/students')
  return {
    ...actual,
    createStudent: vi.fn(),
    getStudents: (...args: unknown[]) => mockGetStudents(...args),
  }
})

vi.mock('../api/lessons', async () => {
  const actual = await vi.importActual('../api/lessons')
  return {
    ...actual,
    createLesson: vi.fn(),
  }
})

import { useProfile } from '../hooks/useProfile'

function renderOnboarding() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<div data-testid="dashboard">Dashboard</div>} />
          <Route path="/lessons/:id" element={<div data-testid="lesson-editor">Lesson Editor</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const newUserProfile = {
  id: '1',
  displayName: '',
  teachingLanguages: [],
  cefrLevels: [],
  preferredStyle: 'Conversational',
  hasCompletedOnboarding: false,
  hasSettings: false,
  hasStudents: false,
  hasLessons: false,
}

const profileWithSettings = {
  ...newUserProfile,
  displayName: 'Test Teacher',
  teachingLanguages: ['English'],
  cefrLevels: ['B1'],
  hasSettings: true,
}

const profileWithStudents = {
  ...profileWithSettings,
  hasStudents: true,
}

describe('Onboarding', () => {
  beforeEach(() => {
    mockUpdateMutate.mockClear()
    mockCompleteMutateAsync.mockClear().mockResolvedValue(undefined)
    mockGetStudents.mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 1 })
  })

  it('shows loading state while profile loads', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    renderOnboarding()
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows step 2 when profile has settings but no students, even if onboarding already marked complete', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: { ...profileWithSettings, hasCompletedOnboarding: true },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    renderOnboarding()
    expect(screen.getByTestId('onboarding-step-2')).toBeInTheDocument()
  })

  it('renders step 1 by default for new user', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: newUserProfile,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    renderOnboarding()
    expect(screen.getByTestId('onboarding-step-1')).toBeInTheDocument()
    expect(screen.getByText('Set up your profile')).toBeInTheDocument()
  })

  it('resumes at step 2 if profile has settings but no students', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: profileWithSettings,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    renderOnboarding()
    expect(screen.getByTestId('onboarding-step-2')).toBeInTheDocument()
    expect(screen.getByText('Add your first student')).toBeInTheDocument()
  })

  it('resumes at step 3 if student exists but no lessons', async () => {
    const mockStudent = {
      id: 'stu-1',
      name: 'Test Student',
      learningLanguage: 'English',
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
    mockGetStudents.mockResolvedValue({ items: [mockStudent], totalCount: 1, page: 1, pageSize: 1 })

    vi.mocked(useProfile).mockReturnValue({
      data: profileWithStudents,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    renderOnboarding()

    // Step indicator shows step 3 as active
    const step3 = screen.getByTestId('step-3')
    expect(step3).toHaveClass('bg-indigo-600')

    // Step 3 form loads after student is fetched
    await waitFor(() => {
      expect(screen.getByTestId('onboarding-step-3')).toBeInTheDocument()
    })
    expect(screen.getByText('Create your first lesson')).toBeInTheDocument()
  })

  it('advances from step 1 to step 2 on profile save', async () => {
    vi.mocked(useProfile).mockReturnValue({
      data: newUserProfile,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    mockUpdateMutate.mockImplementation((_data: unknown, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.()
    })

    renderOnboarding()
    const user = userEvent.setup()

    const nameInput = screen.getByTestId('onboarding-display-name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Test Teacher')

    const nextBtn = screen.getByTestId('onboarding-next')
    await user.click(nextBtn)

    await waitFor(() => {
      expect(screen.getByTestId('onboarding-step-2')).toBeInTheDocument()
    })
  })

  it('shows step indicators with correct active state', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: newUserProfile,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    renderOnboarding()
    const step1 = screen.getByTestId('step-1')
    const step2 = screen.getByTestId('step-2')
    const step3 = screen.getByTestId('step-3')

    expect(step1).toHaveClass('bg-indigo-600')
    expect(step2).toHaveClass('bg-zinc-100')
    expect(step3).toHaveClass('bg-zinc-100')
  })

  it('calls completeOnboarding after step 1 profile save', async () => {
    vi.mocked(useProfile).mockReturnValue({
      data: newUserProfile,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    mockUpdateMutate.mockImplementation((_data: unknown, opts: { onSuccess?: () => void }) => {
      opts.onSuccess?.()
    })

    renderOnboarding()
    const user = userEvent.setup()

    const nameInput = screen.getByTestId('onboarding-display-name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Test Teacher')
    await user.click(screen.getByTestId('onboarding-next'))

    await waitFor(() => {
      expect(screen.getByTestId('onboarding-step-2')).toBeInTheDocument()
    })
    expect(mockCompleteMutateAsync).toHaveBeenCalledOnce()
  })

  it('navigates to dashboard when step 2 skip is clicked', async () => {
    vi.mocked(useProfile).mockReturnValue({
      data: profileWithSettings,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    renderOnboarding()
    const user = userEvent.setup()

    await waitFor(() => expect(screen.getByTestId('onboarding-step-2')).toBeInTheDocument())
    await user.click(screen.getByTestId('onboarding-skip'))

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })
  })

  it('navigates to dashboard when step 3 skip is clicked', async () => {
    const mockStudent = {
      id: 'stu-1',
      name: 'Test Student',
      learningLanguage: 'English',
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
    mockGetStudents.mockResolvedValue({ items: [mockStudent], totalCount: 1, page: 1, pageSize: 1 })

    vi.mocked(useProfile).mockReturnValue({
      data: profileWithStudents,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    renderOnboarding()

    await waitFor(() => expect(screen.getByTestId('onboarding-step-3')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByTestId('onboarding-skip'))

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })
  })

  it('shows validation error when name is empty on step 1', async () => {
    // Temporarily set Auth0 user to have no name so the field stays empty
    const originalName = mockAuth0User.name
    mockAuth0User.name = ''

    vi.mocked(useProfile).mockReturnValue({
      data: newUserProfile,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    renderOnboarding()
    const user = userEvent.setup()

    const nextBtn = screen.getByTestId('onboarding-next')
    await user.click(nextBtn)

    await waitFor(() => {
      expect(screen.getByTestId('step1-error')).toBeInTheDocument()
    })
    expect(mockUpdateMutate).not.toHaveBeenCalled()

    mockAuth0User.name = originalName
  })
})
