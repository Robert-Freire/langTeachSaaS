import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Settings from './Settings'

const mockMutate = vi.fn()
const mockReset = vi.fn()
let mockMutationState = { isPending: false, isSuccess: false, isError: false }

vi.mock('../hooks/useProfile', () => ({
  useProfile: vi.fn(),
  useUpdateProfile: () => ({ mutate: mockMutate, reset: mockReset, ...mockMutationState }),
}))

import { useProfile } from '../hooks/useProfile'

function wrapper(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

const profileData = {
  displayName: 'Test Teacher',
  teachingLanguages: ['English'],
  cefrLevels: ['B1'],
  preferredStyle: 'Conversational',
}

describe('Settings error states', () => {
  beforeEach(() => {
    mockMutationState = { isPending: false, isSuccess: false, isError: false }
    mockMutate.mockClear()
    mockReset.mockClear()
    vi.mocked(useProfile).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)
  })

  it('shows loading indicator while profile is fetching', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    wrapper(<Settings />)
    // Skeleton loading state renders skeleton elements instead of text
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows error message when profile fetch fails', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
    } as unknown as ReturnType<typeof useProfile>)

    wrapper(<Settings />)
    expect(screen.getByText('Failed to load profile. Please try again.')).toBeInTheDocument()
  })

  it('renders the form when profile loads successfully', () => {
    vi.mocked(useProfile).mockReturnValue({
      data: profileData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    wrapper(<Settings />)
    expect(screen.getByRole('button', { name: 'Save Profile' })).toBeInTheDocument()
  })
})

describe('Settings validation and toast behavior', () => {
  beforeEach(() => {
    mockMutationState = { isPending: false, isSuccess: false, isError: false }
    mockMutate.mockClear()
    mockReset.mockClear()
  })

  it('shows validation error and resets success state when display name is empty', async () => {
    mockMutationState = { isPending: false, isSuccess: true, isError: false }
    vi.mocked(useProfile).mockReturnValue({
      data: profileData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    wrapper(<Settings />)
    const user = userEvent.setup()

    // Success message is visible from prior save
    expect(screen.getByTestId('save-success')).toBeInTheDocument()

    // Clear the display name
    const input = screen.getByLabelText('Name')
    await user.clear(input)

    // Submit
    await user.click(screen.getByRole('button', { name: 'Save Profile' }))

    // Validation error appears, success is hidden
    expect(screen.getByTestId('validation-error')).toHaveTextContent('Display Name is required.')
    expect(screen.queryByTestId('save-success')).not.toBeInTheDocument()
    expect(mockReset).toHaveBeenCalled()
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('clears validation error on successful submit', async () => {
    vi.mocked(useProfile).mockReturnValue({
      data: profileData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    wrapper(<Settings />)
    const user = userEvent.setup()

    // Clear name and submit to trigger validation error
    const input = screen.getByLabelText('Name')
    await user.clear(input)
    await user.click(screen.getByRole('button', { name: 'Save Profile' }))
    expect(screen.getByTestId('validation-error')).toBeInTheDocument()

    // Type a name and submit again
    await user.type(input, 'New Teacher')
    await user.click(screen.getByRole('button', { name: 'Save Profile' }))

    // Validation error gone, mutate called
    expect(screen.queryByTestId('validation-error')).not.toBeInTheDocument()
    expect(mockMutate).toHaveBeenCalledTimes(1)
  })

  it('never shows success and validation error simultaneously', async () => {
    mockMutationState = { isPending: false, isSuccess: true, isError: false }
    vi.mocked(useProfile).mockReturnValue({
      data: profileData,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    wrapper(<Settings />)
    const user = userEvent.setup()

    // Clear and submit
    await user.clear(screen.getByLabelText('Name'))
    await user.click(screen.getByRole('button', { name: 'Save Profile' }))

    // Only validation error visible, not both
    expect(screen.getByTestId('validation-error')).toBeInTheDocument()
    expect(screen.queryByTestId('save-success')).not.toBeInTheDocument()
  })
})
