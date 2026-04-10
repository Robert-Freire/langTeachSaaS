import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PendingFollowups } from './PendingFollowups'
import type { ActiveStudent } from '@/api/dashboard'

function makeStudent(overrides: Partial<ActiveStudent> = {}): ActiveStudent {
  return {
    studentId: 'student-1',
    name: 'Ana García',
    cefrLevel: 'B1',
    nativeLanguages: ['English'],
    isActive: true,
    lastSessionDate: null,
    nextSessionDate: null,
    totalSessions: 0,
    teachingTodosCount: 0,
    pendingTodos: [],
    ...overrides,
  }
}

describe('PendingFollowups', () => {
  it('shows all caught up when no pending todos', () => {
    render(<PendingFollowups students={[makeStudent()]} />)
    expect(screen.getByText(/All caught up/)).toBeInTheDocument()
  })

  it('renders pending todo text and student name', () => {
    const student = makeStudent({
      pendingTodos: [
        { id: 't1', text: 'Review ser/estar', createdAt: new Date().toISOString(), status: 'pending', sourceSessionLogId: null, coveredInSessionLogId: null },
      ],
    })
    render(<PendingFollowups students={[student]} />)
    expect(screen.getByText('Review ser/estar')).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('renders zone2-pending-followups testid', () => {
    render(<PendingFollowups students={[]} />)
    expect(screen.getByTestId('zone2-pending-followups')).toBeInTheDocument()
  })

  it('shows todos from multiple students', () => {
    const students = [
      makeStudent({ name: 'Ana', pendingTodos: [{ id: 't1', text: 'Todo A', createdAt: new Date().toISOString(), status: 'pending', sourceSessionLogId: null, coveredInSessionLogId: null }] }),
      makeStudent({ studentId: 'student-2', name: 'Marco', pendingTodos: [{ id: 't2', text: 'Todo B', createdAt: new Date().toISOString(), status: 'pending', sourceSessionLogId: null, coveredInSessionLogId: null }] }),
    ]
    render(<PendingFollowups students={students} />)
    expect(screen.getByText('Todo A')).toBeInTheDocument()
    expect(screen.getByText('Todo B')).toBeInTheDocument()
  })
})
