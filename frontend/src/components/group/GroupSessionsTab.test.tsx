import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { GroupSessionsTab } from './GroupSessionsTab'
import type { GroupSession } from '@/api/groups'

const GROUP_ID = 'group-1'

const SAMPLE_SESSION: GroupSession = {
  id: 'session-1',
  groupId: GROUP_ID,
  sessionDate: '2026-04-15T10:00:00Z',
  title: 'Subjuntivo practice',
  plannedContent: null,
  actualContent: 'Worked on the present subjunctive.',
  generalNotes: null,
  homeworkAssigned: null,
  nextSessionTopics: null,
  isCancelled: false,
  status: 1,
  statusName: 'Confirmed',
  createdAt: '2026-04-15T10:00:00Z',
  updatedAt: '2026-04-15T10:00:00Z',
  duration: 60,
}

function renderTab(sessions: GroupSession[]) {
  return render(
    <MemoryRouter>
      <GroupSessionsTab groupId={GROUP_ID} sessions={sessions} />
    </MemoryRouter>,
  )
}

describe('GroupSessionsTab', () => {
  it('renders the date tile with day and month only, no year (#1378)', () => {
    renderTab([SAMPLE_SESSION])
    const item = screen.getByTestId('group-session-item')
    // Day + abbreviated month present...
    expect(item).toHaveTextContent('15')
    expect(item).toHaveTextContent('APR')
    // ...but the 4-digit year must NOT be crammed into the compact tile.
    expect(item).not.toHaveTextContent('2026')
  })

  it('links each session row to the edit route so it opens the editor, not a blank page (#1379)', () => {
    renderTab([SAMPLE_SESSION])
    const link = screen.getByTestId('group-session-item')
    expect(link).toHaveAttribute('href', `/groups/${GROUP_ID}/sessions/${SAMPLE_SESSION.id}/edit`)
  })

  it('shows an empty state when there are no sessions', () => {
    renderTab([])
    expect(screen.getByTestId('sessions-empty-state')).toBeInTheDocument()
  })
})
