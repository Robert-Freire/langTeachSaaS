import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Groups from './Groups'
import * as groupsApi from '../api/groups'

vi.mock('../api/groups', () => ({
  getGroups: vi.fn(),
}))

function makeGroup(overrides: Partial<groupsApi.Group> = {}): groupsApi.Group {
  return {
    id: 'g1',
    teacherId: 't1',
    name: 'B1.1 Tuesdays',
    cefrLevel: 'B1',
    description: null,
    memberCount: 5,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    members: null,
    memberPreview: [
      { id: 's1', name: 'Ana Garcia', cefrLevel: 'B1' },
      { id: 's2', name: 'Yasmine A', cefrLevel: 'B1' },
      { id: 's3', name: 'Carlos M', cefrLevel: 'B1' },
      { id: 's4', name: 'Diana K', cefrLevel: 'B1' },
    ],
    lastSessionDate: null,
    nextSessionDate: null,
    ...overrides,
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <Groups />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('Groups page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state with no CTA inside the card when zero groups', async () => {
    vi.mocked(groupsApi.getGroups).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 })

    renderPage()

    await waitFor(() => expect(screen.getByTestId('groups-empty-state')).toBeInTheDocument())
    expect(screen.getByText('No groups yet')).toBeInTheDocument()
    expect(screen.getByText(/Add a group to log sessions/i)).toBeInTheDocument()
    // No CTA inside the empty card (toolbar Add Group is outside)
    const emptyCard = screen.getByTestId('groups-empty-state')
    expect(emptyCard.querySelector('button')).toBeNull()
    expect(emptyCard.querySelector('a')).toBeNull()
  })

  it('renders the table with rows when groups exist', async () => {
    vi.mocked(groupsApi.getGroups).mockResolvedValue({
      items: [makeGroup(), makeGroup({ id: 'g2', name: 'A2.1 Mondays', cefrLevel: 'A2', memberCount: 3 })],
      totalCount: 2,
      page: 1,
      pageSize: 100,
    })

    renderPage()

    await waitFor(() => expect(screen.getByText('B1.1 Tuesdays')).toBeInTheDocument())
    expect(screen.getByText('A2.1 Mondays')).toBeInTheDocument()
    expect(screen.getByText('Your academy classes, 2 active')).toBeInTheDocument()
    expect(screen.getAllByTestId('group-avatar-cluster')).toHaveLength(2)
  })

  it('filters by CEFR pill', async () => {
    vi.mocked(groupsApi.getGroups).mockResolvedValue({
      items: [makeGroup(), makeGroup({ id: 'g2', name: 'A2.1 Mondays', cefrLevel: 'A2' })],
      totalCount: 2,
      page: 1,
      pageSize: 100,
    })

    renderPage()

    await waitFor(() => expect(screen.getByText('B1.1 Tuesdays')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('cefr-pill-A2'))
    expect(screen.queryByText('B1.1 Tuesdays')).toBeNull()
    expect(screen.getByText('A2.1 Mondays')).toBeInTheDocument()
  })

  it('filters by search input', async () => {
    vi.mocked(groupsApi.getGroups).mockResolvedValue({
      items: [makeGroup(), makeGroup({ id: 'g2', name: 'A2.1 Mondays', cefrLevel: 'A2' })],
      totalCount: 2,
      page: 1,
      pageSize: 100,
    })

    renderPage()

    await waitFor(() => expect(screen.getByText('B1.1 Tuesdays')).toBeInTheDocument())
    fireEvent.change(screen.getByTestId('groups-search'), { target: { value: 'Monday' } })
    await waitFor(() => expect(screen.queryByText('B1.1 Tuesdays')).toBeNull())
    expect(screen.getByText('A2.1 Mondays')).toBeInTheDocument()
  })

  it('Add Group button is rendered and enabled', async () => {
    vi.mocked(groupsApi.getGroups).mockResolvedValue({ items: [makeGroup()], totalCount: 1, page: 1, pageSize: 100 })

    renderPage()

    await waitFor(() => expect(screen.getByTestId('add-group-button')).toBeInTheDocument())
    expect(screen.getByTestId('add-group-button')).not.toBeDisabled()
  })
})
