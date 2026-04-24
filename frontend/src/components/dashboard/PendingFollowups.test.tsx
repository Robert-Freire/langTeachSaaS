import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
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

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('PendingFollowups', () => {
  it('shows all caught up when no followups', () => {
    wrap(<PendingFollowups followups={[]} />)
    expect(screen.getByText(/All caught up/)).toBeInTheDocument()
  })

  it('renders followup text and student name', () => {
    wrap(<PendingFollowups followups={[makeFollowup()]} />)
    expect(screen.getByText('Enviar ejercicio')).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('renders zone2-pending-followups testid', () => {
    wrap(<PendingFollowups followups={[]} />)
    expect(screen.getByTestId('zone2-pending-followups')).toBeInTheDocument()
  })

  it('shows followups from multiple students', () => {
    const followups = [
      makeFollowup({ id: 'f1', studentId: 's1', studentName: 'Ana', text: 'Todo A' }),
      makeFollowup({ id: 'f2', studentId: 's2', studentName: 'Marco', text: 'Todo B' }),
    ]
    wrap(<PendingFollowups followups={followups} />)
    expect(screen.getByText('Todo A')).toBeInTheDocument()
    expect(screen.getByText('Todo B')).toBeInTheDocument()
  })

  it('renders mark-done button for each followup', () => {
    wrap(<PendingFollowups followups={[makeFollowup({ id: 'f1' })]} />)
    expect(screen.getByTestId('followup-dot-f1')).toBeInTheDocument()
  })

  it('mark-done button has title="Mark as done"', () => {
    wrap(<PendingFollowups followups={[makeFollowup({ id: 'f1' })]} />)
    expect(screen.getByTestId('followup-dot-f1')).toHaveAttribute('title', 'Mark as done')
  })

  it('shows TODAY badge for followup created today', () => {
    wrap(<PendingFollowups followups={[makeFollowup({ id: 'f1', createdAt: new Date().toISOString() })]} />)
    expect(screen.getByTestId('followup-age-f1')).toHaveTextContent('TODAY')
  })

  it('shows DAYS OVERDUE badge for followup more than 3 days old', () => {
    const old = new Date(Date.now() - 7 * 86400000).toISOString()
    wrap(<PendingFollowups followups={[makeFollowup({ id: 'f1', createdAt: old })]} />)
    expect(screen.getByTestId('followup-age-f1')).toHaveTextContent('DAYS OVERDUE')
  })

  it('shows YESTERDAY badge for followup 1 day old', () => {
    const yesterday = new Date(Date.now() - 1 * 86400000).toISOString()
    wrap(<PendingFollowups followups={[makeFollowup({ id: 'f1', createdAt: yesterday })]} />)
    expect(screen.getByTestId('followup-age-f1')).toHaveTextContent('YESTERDAY')
  })

  it('shows DAYS AGO badge for followup 2-3 days old', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString()
    wrap(<PendingFollowups followups={[makeFollowup({ id: 'f1', createdAt: twoDaysAgo })]} />)
    expect(screen.getByTestId('followup-age-f1')).toHaveTextContent('DAYS AGO')
  })

  it('student name chip links to student profile', () => {
    wrap(<PendingFollowups followups={[makeFollowup({ id: 'f1', studentId: 'student-1' })]} />)
    expect(screen.getByTestId('followup-student-link-f1')).toHaveAttribute('href', '/students/student-1')
  })

  it('does not show chip for second followup from same student', () => {
    const followups = [
      makeFollowup({ id: 'f1', studentId: 'student-1', studentName: 'Ana García' }),
      makeFollowup({ id: 'f2', studentId: 'student-1', studentName: 'Ana García', text: 'Second todo' }),
    ]
    wrap(<PendingFollowups followups={followups} />)
    expect(screen.getByTestId('followup-student-link-f1')).toBeInTheDocument()
    expect(screen.queryByTestId('followup-student-link-f2')).not.toBeInTheDocument()
  })

  it('shows SEE ALL link when more than 5 followups', () => {
    const followups = Array.from({ length: 6 }, (_, i) =>
      makeFollowup({ id: `f${i}`, studentId: `s${i}`, text: `Todo ${i}` }),
    )
    wrap(<PendingFollowups followups={followups} />)
    expect(screen.getByTestId('followups-see-all')).toBeInTheDocument()
  })

  it('does not show SEE ALL when 5 or fewer followups', () => {
    const followups = Array.from({ length: 5 }, (_, i) =>
      makeFollowup({ id: `f${i}`, studentId: `s${i}`, text: `Todo ${i}` }),
    )
    wrap(<PendingFollowups followups={followups} />)
    expect(screen.queryByTestId('followups-see-all')).not.toBeInTheDocument()
  })

  it('row click navigates to student overview', () => {
    wrap(<PendingFollowups followups={[makeFollowup({ id: 'f1', studentId: 'student-1' })]} />)
    expect(screen.getByTestId('followup-text-link-f1')).toHaveAttribute('href', '/students/student-1')
  })

  it('row without studentId renders no text link', () => {
    wrap(<PendingFollowups followups={[makeFollowup({ id: 'f1', studentId: null })]} />)
    expect(screen.queryByTestId('followup-text-link-f1')).not.toBeInTheDocument()
  })

  it('dot button is not inside the text link', () => {
    wrap(<PendingFollowups followups={[makeFollowup({ id: 'f1', studentId: 'student-1' })]} />)
    const link = screen.getByTestId('followup-text-link-f1')
    const dot = screen.getByTestId('followup-dot-f1')
    expect(link).not.toContainElement(dot)
  })
})
