import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { TelegramStatus } from '../../api/telegram'
import { TelegramCard } from './TelegramCard'

const mockGetStatus = vi.fn()
const mockGenerateCode = vi.fn()
const mockDeleteLink = vi.fn()

vi.mock('../../api/telegram', () => ({
  getTelegramStatus: (...args: unknown[]) => mockGetStatus(...args),
  generateConnectCode: (...args: unknown[]) => mockGenerateCode(...args),
  deleteTelegramLink: (...args: unknown[]) => mockDeleteLink(...args),
}))

function renderCard(qc?: QueryClient) {
  const client = qc ?? new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return { client, ...render(
    <QueryClientProvider client={client}>
      <TelegramCard />
    </QueryClientProvider>,
  )}
}

describe('TelegramCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStatus.mockResolvedValue({ connected: false, linkedAt: null })
    mockGenerateCode.mockResolvedValue({ code: 'ABCD1234', expiresAt: new Date(Date.now() + 600000).toISOString() })
    mockDeleteLink.mockResolvedValue(undefined)
  })

  it('shows Connect Telegram button when not connected', async () => {
    renderCard()
    expect(await screen.findByTestId('telegram-connect-btn')).toBeInTheDocument()
  })

  it('shows code and instructions after clicking Connect Telegram', async () => {
    renderCard()
    const btn = await screen.findByTestId('telegram-connect-btn')
    fireEvent.click(btn)
    expect(await screen.findByTestId('telegram-code')).toHaveTextContent('ABCD1234')
    expect(screen.getByText(/@langteach13_bot/)).toBeInTheDocument()
  })

  it('Cancel button returns to idle state without calling DELETE', async () => {
    renderCard()
    const btn = await screen.findByTestId('telegram-connect-btn')
    fireEvent.click(btn)
    const cancelBtn = await screen.findByTestId('telegram-cancel-btn')
    fireEvent.click(cancelBtn)
    expect(await screen.findByTestId('telegram-idle')).toBeInTheDocument()
    expect(mockDeleteLink).not.toHaveBeenCalled()
  })

  it('shows Connected state when status is connected', async () => {
    mockGetStatus.mockResolvedValue({ connected: true, linkedAt: '2026-04-06T10:00:00Z' })
    renderCard()
    expect(await screen.findByTestId('telegram-connected')).toBeInTheDocument()
    expect(screen.getByText(/Connected/)).toBeInTheDocument()
  })

  it('shows formatted linkedAt date when connected', async () => {
    mockGetStatus.mockResolvedValue({ connected: true, linkedAt: '2026-04-06T10:00:00Z' })
    renderCard()
    await screen.findByTestId('telegram-connected')
    expect(screen.getByText(/Linked on/)).toBeInTheDocument()
  })

  it('Disconnect button calls DELETE and returns to idle', async () => {
    mockGetStatus
      .mockResolvedValueOnce({ connected: true, linkedAt: '2026-04-06T10:00:00Z' })
      .mockResolvedValue({ connected: false, linkedAt: null })
    renderCard()
    const disconnectBtn = await screen.findByTestId('telegram-disconnect-btn')
    await act(async () => { fireEvent.click(disconnectBtn) })
    expect(mockDeleteLink).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByTestId('telegram-idle')).toBeInTheDocument())
  })

  it('shows timed-out message after 5 minutes of polling', async () => {
    // shouldAdvanceTime keeps real-time advancing so findBy* queries still resolve
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      renderCard()
      const btn = await screen.findByTestId('telegram-connect-btn')
      fireEvent.click(btn)
      await screen.findByTestId('telegram-pending')

      // Advance fake clock past the 5-minute timeout
      await act(async () => { vi.advanceTimersByTime(5 * 60 * 1000 + 100) })

      expect(screen.getByText('Timed out. Please try again.')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('transitions to connected state when query cache is updated to connected', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    renderCard(qc)

    // Start connect flow
    const btn = await screen.findByTestId('telegram-connect-btn')
    fireEvent.click(btn)
    await screen.findByTestId('telegram-pending')

    // Simulate polling detecting connection by injecting into query cache
    await act(async () => {
      qc.setQueryData<TelegramStatus>(['telegram-status'], { connected: true, linkedAt: '2026-04-06T10:00:00Z' })
    })

    await waitFor(() => expect(screen.queryByTestId('telegram-connected')).toBeInTheDocument())
  })
})
