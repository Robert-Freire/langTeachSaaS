import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TeachingChannelPicker } from './TeachingChannelPicker'
import * as studentsApi from '@/api/students'

vi.mock('@/api/students', () => ({
  patchStudentChannel: vi.fn(),
}))

function wrapper(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(studentsApi.patchStudentChannel).mockResolvedValue(undefined)
})

describe('TeachingChannelPicker', () => {
  it('renders the channel badge when value is set', () => {
    wrapper(<TeachingChannelPicker value="Preply" studentId="s1" />)
    expect(screen.getByTestId('teaching-channel-badge')).toBeInTheDocument()
    expect(screen.getByText('Preply')).toBeInTheDocument()
  })

  it('renders the ghost pill when value is null', () => {
    wrapper(<TeachingChannelPicker value={null} studentId="s1" />)
    expect(screen.getByTestId('teaching-channel-ghost')).toBeInTheDocument()
  })

  it('calls patchStudentChannel and onSaved when a new option is selected', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    wrapper(<TeachingChannelPicker value="Preply" studentId="s1" onSaved={onSaved} />)

    await user.click(screen.getByTestId('teaching-channel-badge'))
    await user.click(screen.getByTestId('channel-option-meet'))

    await waitFor(() => {
      expect(studentsApi.patchStudentChannel).toHaveBeenCalledWith('s1', 'Meet')
      expect(onSaved).toHaveBeenCalledWith('Meet')
    })
  })

  it('is a no-op when selecting the current value', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    wrapper(<TeachingChannelPicker value="Meet" studentId="s1" onSaved={onSaved} />)

    await user.click(screen.getByTestId('teaching-channel-badge'))
    await user.click(screen.getByTestId('channel-option-meet'))

    expect(studentsApi.patchStudentChannel).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('reverts optimistic value and shows error on PATCH failure', async () => {
    vi.mocked(studentsApi.patchStudentChannel).mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()
    wrapper(<TeachingChannelPicker value="Preply" studentId="s1" />)

    await user.click(screen.getByTestId('teaching-channel-badge'))
    await user.click(screen.getByTestId('channel-option-meet'))

    await waitFor(() => {
      expect(screen.getByTestId('channel-error')).toBeInTheDocument()
    })
    expect(screen.getByTestId('teaching-channel-badge')).toHaveTextContent('Preply')
  })

  it('clears the channel when None is selected', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    wrapper(<TeachingChannelPicker value="Preply" studentId="s1" onSaved={onSaved} />)

    await user.click(screen.getByTestId('teaching-channel-badge'))
    await user.click(screen.getByTestId('channel-option-none'))

    await waitFor(() => {
      expect(studentsApi.patchStudentChannel).toHaveBeenCalledWith('s1', null)
      expect(onSaved).toHaveBeenCalledWith(null)
    })
  })
})
