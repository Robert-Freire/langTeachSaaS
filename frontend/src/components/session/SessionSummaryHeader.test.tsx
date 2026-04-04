import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionSummaryHeader } from './SessionSummaryHeader'
import * as sessionLogsApi from '../../api/sessionLogs'

vi.mock('../../api/sessionLogs', () => ({
  getSessionSummary: vi.fn(),
}))

const BASE_SUMMARY: sessionLogsApi.StudentSessionSummary = {
  totalSessions: 5,
  lastSessionDate: '2026-03-30',
  daysSinceLastSession: 4,
  openActionItems: [],
  levelReassessmentPending: false,
  skillLevelOverrides: {},
}

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <SessionSummaryHeader studentId="student-1" />
    </QueryClientProvider>
  )
}

describe('SessionSummaryHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders skeleton while loading', () => {
    vi.mocked(sessionLogsApi.getSessionSummary).mockReturnValue(new Promise(() => {}))
    wrapper()
    expect(screen.getByTestId('session-summary-loading')).toBeInTheDocument()
  })

  it('renders "No sessions yet" when totalSessions is 0', async () => {
    vi.mocked(sessionLogsApi.getSessionSummary).mockResolvedValue({ ...BASE_SUMMARY, totalSessions: 0, lastSessionDate: null, daysSinceLastSession: null })
    wrapper()
    expect(await screen.findByTestId('session-summary-no-sessions')).toBeInTheDocument()
    expect(screen.queryByTestId('session-summary-header')).not.toBeInTheDocument()
  })

  it('renders session count and last date', async () => {
    vi.mocked(sessionLogsApi.getSessionSummary).mockResolvedValue(BASE_SUMMARY)
    wrapper()
    await screen.findByTestId('session-summary-header')
    expect(screen.getByText(/5 sessions/)).toBeInTheDocument()
    expect(screen.getByText(/Last:/)).toBeInTheDocument()
  })

  it('action items badge hidden when no action items', async () => {
    vi.mocked(sessionLogsApi.getSessionSummary).mockResolvedValue({ ...BASE_SUMMARY, openActionItems: [] })
    wrapper()
    await screen.findByTestId('session-summary-header')
    expect(screen.queryByTestId('session-summary-action-items-toggle')).not.toBeInTheDocument()
  })

  it('action items badge shows count and expands on click', async () => {
    vi.mocked(sessionLogsApi.getSessionSummary).mockResolvedValue({
      ...BASE_SUMMARY,
      openActionItems: ['Work on para/por', 'More listening practice'],
    })
    wrapper()
    const toggle = await screen.findByTestId('session-summary-action-items-toggle')
    expect(toggle).toHaveTextContent('2 action items')
    expect(screen.queryByTestId('session-summary-action-items-list')).not.toBeInTheDocument()

    fireEvent.click(toggle)
    const list = screen.getByTestId('session-summary-action-items-list')
    expect(list).toBeInTheDocument()
    expect(list).toHaveTextContent('Work on para/por')
    expect(list).toHaveTextContent('More listening practice')
  })

  it('reassessment badge hidden when levelReassessmentPending is false', async () => {
    vi.mocked(sessionLogsApi.getSessionSummary).mockResolvedValue({ ...BASE_SUMMARY, levelReassessmentPending: false })
    wrapper()
    await screen.findByTestId('session-summary-header')
    expect(screen.queryByTestId('session-summary-reassessment-badge')).not.toBeInTheDocument()
  })

  it('reassessment badge visible when levelReassessmentPending is true', async () => {
    vi.mocked(sessionLogsApi.getSessionSummary).mockResolvedValue({
      ...BASE_SUMMARY,
      levelReassessmentPending: true,
      skillLevelOverrides: { speaking: 'A1.2' },
    })
    wrapper()
    expect(await screen.findByTestId('session-summary-reassessment-badge')).toBeInTheDocument()
  })

  it('reassessment details expand on click showing skill overrides', async () => {
    vi.mocked(sessionLogsApi.getSessionSummary).mockResolvedValue({
      ...BASE_SUMMARY,
      levelReassessmentPending: true,
      skillLevelOverrides: { speaking: 'A1.2' },
    })
    wrapper()
    const badge = await screen.findByTestId('session-summary-reassessment-badge')
    expect(screen.queryByTestId('session-summary-reassessment-details')).not.toBeInTheDocument()

    fireEvent.click(badge)
    const details = screen.getByTestId('session-summary-reassessment-details')
    expect(details).toBeInTheDocument()
    expect(details).toHaveTextContent('Speaking')
    expect(details).toHaveTextContent('A1.2')
  })
})
