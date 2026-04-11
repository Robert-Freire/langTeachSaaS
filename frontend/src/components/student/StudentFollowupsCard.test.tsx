import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StudentFollowupsCard } from './StudentFollowupsCard'
import type { TeacherFollowup } from '@/api/followups'

const mockCreate = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/api/followups', () => ({
  createFollowup: (...args: unknown[]) => mockCreate(...args),
  updateFollowupStatus: (...args: unknown[]) => mockUpdate(...args),
}))

function makeFollowup(overrides: Partial<TeacherFollowup> = {}): TeacherFollowup {
  return {
    id: 'f1',
    studentId: 'student-1',
    studentName: null,
    text: 'Enviar ejercicio',
    status: 'pending',
    createdAt: new Date().toISOString(),
    dueDate: null,
    completedAt: null,
    sourceSessionLogId: null,
    ...overrides,
  }
}

function renderCard(props: { followups: TeacherFollowup[]; studentId?: string; onFollowupChange?: () => void }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <StudentFollowupsCard
        followups={props.followups}
        studentId={props.studentId ?? 's1'}
        onFollowupChange={props.onFollowupChange ?? vi.fn()}
      />
    </QueryClientProvider>,
  )
}

describe('StudentFollowupsCard', () => {
  const onFollowupChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({ id: 'new-f', text: 'Nueva', status: 'pending', createdAt: new Date().toISOString(), studentId: 'student-1', studentName: null, dueDate: null, completedAt: null, sourceSessionLogId: null })
    mockUpdate.mockResolvedValue({})
  })

  it('shows empty state when no followups', () => {
    renderCard({ followups: [], onFollowupChange })
    expect(screen.getByText(/No pending followups/)).toBeInTheDocument()
  })

  it('renders pending followup text', () => {
    renderCard({ followups: [makeFollowup()], onFollowupChange })
    expect(screen.getByText('Enviar ejercicio')).toBeInTheDocument()
  })

  it('renders done followup with strikethrough styling', () => {
    renderCard({ followups: [makeFollowup({ id: 'f2', status: 'done' })], onFollowupChange })
    const doneText = screen.getByText('Enviar ejercicio')
    expect(doneText.className).toContain('line-through')
  })

  it('shows overdue indicator for old pending followups', () => {
    const oldDate = new Date(Date.now() - 10 * 86400000).toISOString()
    renderCard({ followups: [makeFollowup({ id: 'f1', createdAt: oldDate })], onFollowupChange })
    expect(screen.getByTestId('followup-overdue-f1')).toBeInTheDocument()
    expect(screen.getByTestId('followup-overdue-f1').textContent).toMatch(/Overdue \(\d+ days\)/)
  })

  it('calls createFollowup when add button clicked', async () => {
    renderCard({ followups: [], onFollowupChange })
    fireEvent.change(screen.getByTestId('followup-input'), { target: { value: 'Nueva tarea' } })
    fireEvent.click(screen.getByTestId('followup-add-btn'))
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ text: 'Nueva tarea', studentId: 's1' }))
    expect(onFollowupChange).toHaveBeenCalled()
  })

  it('calls updateFollowupStatus when done button clicked', async () => {
    renderCard({ followups: [makeFollowup({ id: 'f1' })], onFollowupChange })
    fireEvent.click(screen.getByTestId('followup-done-btn-f1'))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('f1', 'done'))
    expect(onFollowupChange).toHaveBeenCalled()
  })

  it('renders add input with amber-50 tint', () => {
    renderCard({ followups: [], onFollowupChange })
    const input = screen.getByTestId('followup-input')
    expect(input.className).toContain('amber-50')
  })

  it('renders the student-followups-card testid', () => {
    renderCard({ followups: [], onFollowupChange })
    expect(screen.getByTestId('student-followups-card')).toBeInTheDocument()
  })
})
