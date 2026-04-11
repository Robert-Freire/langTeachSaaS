import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PendingFollowups } from './PendingFollowups'
import type { TeacherFollowup } from '@/api/followups'

vi.mock('@/api/followups', async () => {
  const actual = await vi.importActual<typeof import('@/api/followups')>('@/api/followups')
  return { ...actual, updateFollowupStatus: vi.fn().mockResolvedValue({}) }
})

function makeFollowup(overrides: Partial<TeacherFollowup> = {}): TeacherFollowup {
  return {
    id: 'f1',
    studentId: 'student-1',
    studentName: 'Ana García',
    text: 'Enviar ejercicio',
    status: 'pending',
    createdAt: new Date().toISOString(),
    dueDate: null,
    completedAt: null,
    sourceSessionLogId: null,
    ...overrides,
  }
}

describe('PendingFollowups', () => {
  it('shows all caught up when no followups', () => {
    render(<PendingFollowups followups={[]} />)
    expect(screen.getByText(/All caught up/)).toBeInTheDocument()
  })

  it('renders followup text and student name', () => {
    render(<PendingFollowups followups={[makeFollowup()]} />)
    expect(screen.getByText('Enviar ejercicio')).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('renders zone2-pending-followups testid', () => {
    render(<PendingFollowups followups={[]} />)
    expect(screen.getByTestId('zone2-pending-followups')).toBeInTheDocument()
  })

  it('shows followups from multiple students', () => {
    const followups = [
      makeFollowup({ id: 'f1', studentName: 'Ana', text: 'Todo A' }),
      makeFollowup({ id: 'f2', studentName: 'Marco', text: 'Todo B' }),
    ]
    render(<PendingFollowups followups={followups} />)
    expect(screen.getByText('Todo A')).toBeInTheDocument()
    expect(screen.getByText('Todo B')).toBeInTheDocument()
  })

  it('renders mark-done button for each followup', () => {
    render(<PendingFollowups followups={[makeFollowup({ id: 'f1' })]} />)
    expect(screen.getByTestId('followup-dot-f1')).toBeInTheDocument()
  })
})
