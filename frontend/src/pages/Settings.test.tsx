import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Settings from './Settings'

vi.mock('../hooks/useProfile', () => ({
  useProfile: vi.fn(),
  useUpdateProfile: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false, isError: false }),
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

describe('Settings error states', () => {
  beforeEach(() => {
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
    expect(screen.getByText('Loading profile...')).toBeInTheDocument()
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
      data: {
        displayName: 'Test Teacher',
        teachingLanguages: [],
        cefrLevels: [],
        preferredStyle: 'Conversational',
      },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useProfile>)

    wrapper(<Settings />)
    expect(screen.getByRole('button', { name: 'Save Profile' })).toBeInTheDocument()
  })
})
