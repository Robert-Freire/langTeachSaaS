import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PendingFollowups } from './PendingFollowups'
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
    studentName: 'Ana García',
    groupId: null,
    text: 'Enviar ejercicio',
    status: 'pending',
    kind: 'operational',
    createdAt: new Date().toISOString(),
    dueDate: null,
    completedAt: null,
    sourceSessionLogId: null,
    ...overrides,
  }
}

function wrap(props: { followups: TeacherFollowup[]; onNoteAdded?: () => void }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PendingFollowups followups={props.followups} onNoteAdded={props.onNoteAdded ?? vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PendingFollowups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({
      id: 'new-f',
      text: 'Nueva nota',
      status: 'pending',
      kind: 'operational',
      createdAt: new Date().toISOString(),
      studentId: null,
      studentName: null,
      groupId: null,
      dueDate: null,
      completedAt: null,
      sourceSessionLogId: null,
    })
    mockUpdate.mockResolvedValue({})
  })

  it('shows all caught up when no followups', () => {
    wrap({ followups: [] })
    expect(screen.getByText(/All caught up/)).toBeInTheDocument()
  })

  it('renders followup text and student name', () => {
    wrap({ followups: [makeFollowup()] })
    expect(screen.getByText('Enviar ejercicio')).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('renders zone2-pending-followups testid', () => {
    wrap({ followups: [] })
    expect(screen.getByTestId('zone2-pending-followups')).toBeInTheDocument()
  })

  it('shows followups from multiple students', () => {
    const followups = [
      makeFollowup({ id: 'f1', studentId: 's1', studentName: 'Ana', text: 'Todo A' }),
      makeFollowup({ id: 'f2', studentId: 's2', studentName: 'Marco', text: 'Todo B' }),
    ]
    wrap({ followups })
    expect(screen.getByText('Todo A')).toBeInTheDocument()
    expect(screen.getByText('Todo B')).toBeInTheDocument()
  })

  it('renders mark-done button for each followup', () => {
    wrap({ followups: [makeFollowup({ id: 'f1' })] })
    expect(screen.getByTestId('followup-dot-f1')).toBeInTheDocument()
  })

  it('mark-done button has title="Mark as done"', () => {
    wrap({ followups: [makeFollowup({ id: 'f1' })] })
    expect(screen.getByTestId('followup-dot-f1')).toHaveAttribute('title', 'Mark as done')
  })

  it('shows TODAY badge for followup created today', () => {
    wrap({ followups: [makeFollowup({ id: 'f1', createdAt: new Date().toISOString() })] })
    expect(screen.getByTestId('followup-age-f1')).toHaveTextContent('TODAY')
  })

  it('shows DAYS OVERDUE badge for followup more than 3 days old', () => {
    const old = new Date(Date.now() - 7 * 86400000).toISOString()
    wrap({ followups: [makeFollowup({ id: 'f1', createdAt: old })] })
    expect(screen.getByTestId('followup-age-f1')).toHaveTextContent('DAYS OVERDUE')
  })

  it('shows YESTERDAY badge for followup 1 day old', () => {
    const yesterday = new Date(Date.now() - 1 * 86400000).toISOString()
    wrap({ followups: [makeFollowup({ id: 'f1', createdAt: yesterday })] })
    expect(screen.getByTestId('followup-age-f1')).toHaveTextContent('YESTERDAY')
  })

  it('shows DAYS AGO badge for followup 2-3 days old', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString()
    wrap({ followups: [makeFollowup({ id: 'f1', createdAt: twoDaysAgo })] })
    expect(screen.getByTestId('followup-age-f1')).toHaveTextContent('DAYS AGO')
  })

  it('student name chip links to student profile', () => {
    wrap({ followups: [makeFollowup({ id: 'f1', studentId: 'student-1' })] })
    expect(screen.getByTestId('followup-student-link-f1')).toHaveAttribute('href', '/students/student-1')
  })

  it('does not show chip for second followup from same student', () => {
    const followups = [
      makeFollowup({ id: 'f1', studentId: 'student-1', studentName: 'Ana García' }),
      makeFollowup({ id: 'f2', studentId: 'student-1', studentName: 'Ana García', text: 'Second todo' }),
    ]
    wrap({ followups })
    expect(screen.getByTestId('followup-student-link-f1')).toBeInTheDocument()
    expect(screen.queryByTestId('followup-student-link-f2')).not.toBeInTheDocument()
  })

  it('shows SEE ALL link when more than 5 followups', () => {
    const followups = Array.from({ length: 6 }, (_, i) =>
      makeFollowup({ id: `f${i}`, studentId: `s${i}`, text: `Todo ${i}` }),
    )
    wrap({ followups })
    expect(screen.getByTestId('followups-see-all')).toBeInTheDocument()
  })

  it('does not show SEE ALL when 5 or fewer followups', () => {
    const followups = Array.from({ length: 5 }, (_, i) =>
      makeFollowup({ id: `f${i}`, studentId: `s${i}`, text: `Todo ${i}` }),
    )
    wrap({ followups })
    expect(screen.queryByTestId('followups-see-all')).not.toBeInTheDocument()
  })

  it('row click navigates to student overview', () => {
    wrap({ followups: [makeFollowup({ id: 'f1', studentId: 'student-1' })] })
    expect(screen.getByTestId('followup-text-link-f1')).toHaveAttribute('href', '/students/student-1')
  })

  it('row without studentId renders no text link', () => {
    wrap({ followups: [makeFollowup({ id: 'f1', studentId: null })] })
    expect(screen.queryByTestId('followup-text-link-f1')).not.toBeInTheDocument()
  })

  it('dot button is not inside the text link', () => {
    wrap({ followups: [makeFollowup({ id: 'f1', studentId: 'student-1' })] })
    const link = screen.getByTestId('followup-text-link-f1')
    const dot = screen.getByTestId('followup-dot-f1')
    expect(link).not.toContainElement(dot)
  })

  describe('add a general note', () => {
    it('renders the add row even when the card is empty', () => {
      wrap({ followups: [] })
      expect(screen.getByTestId('general-note-input')).toBeInTheDocument()
      expect(screen.getByText(/All caught up/)).toBeInTheDocument()
    })

    it('creates a general note with no student or group on Enter', async () => {
      const onNoteAdded = vi.fn()
      wrap({ followups: [], onNoteAdded })
      fireEvent.change(screen.getByTestId('general-note-input'), { target: { value: 'Preparar material sobre "lo"' } })
      fireEvent.keyDown(screen.getByTestId('general-note-input'), { key: 'Enter' })
      await waitFor(() =>
        expect(mockCreate).toHaveBeenCalledWith({ text: 'Preparar material sobre "lo"', studentId: null, groupId: null }),
      )
      expect(onNoteAdded).toHaveBeenCalled()
    })

    it('clears and refocuses the input after a successful save', async () => {
      wrap({ followups: [] })
      const input = screen.getByTestId('general-note-input') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Nueva nota' } })
      fireEvent.click(screen.getByTestId('general-note-add-btn'))
      await waitFor(() => expect(input.value).toBe(''))
      expect(document.activeElement).toBe(input)
    })

    it('does not submit on empty or whitespace-only input', () => {
      wrap({ followups: [] })
      fireEvent.keyDown(screen.getByTestId('general-note-input'), { key: 'Enter' })
      expect(mockCreate).not.toHaveBeenCalled()

      fireEvent.change(screen.getByTestId('general-note-input'), { target: { value: '   ' } })
      fireEvent.keyDown(screen.getByTestId('general-note-input'), { key: 'Enter' })
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('does not create a duplicate on double submit while a save is in flight', async () => {
      let resolveCreate: (value: TeacherFollowup) => void = () => {}
      mockCreate.mockReturnValue(new Promise<TeacherFollowup>(resolve => { resolveCreate = resolve }))
      wrap({ followups: [] })
      const input = screen.getByTestId('general-note-input')
      fireEvent.change(input, { target: { value: 'Nota' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1))
      fireEvent.keyDown(input, { key: 'Enter' })
      fireEvent.click(screen.getByTestId('general-note-add-btn'))
      expect(mockCreate).toHaveBeenCalledTimes(1)
      resolveCreate(makeFollowup({ id: 'new-f', studentId: null, studentName: null }))
      await waitFor(() => expect((input as HTMLInputElement).value).toBe(''))
    })

    it('does not create a duplicate when Enter and the Add button fire back-to-back in the same synchronous pass', async () => {
      // Regression test: createMutation.isPending is a snapshot from the
      // last render (React Query notifies re-renders via a batched,
      // macrotask-scheduled manager), so it can still read stale/false
      // across two handleAddNote() calls that both run before any
      // re-render happens. A ref-based latch, set synchronously the
      // instant the first call starts, is what actually prevents the
      // second call regardless of render/notification timing.
      let resolveCreate: (value: TeacherFollowup) => void = () => {}
      mockCreate.mockReturnValue(new Promise<TeacherFollowup>(resolve => { resolveCreate = resolve }))
      wrap({ followups: [] })
      const input = screen.getByTestId('general-note-input')
      fireEvent.change(input, { target: { value: 'Nota' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      fireEvent.click(screen.getByTestId('general-note-add-btn'))
      await waitFor(() => expect(mockCreate).toHaveBeenCalled())
      expect(mockCreate).toHaveBeenCalledTimes(1)
      resolveCreate(makeFollowup({ id: 'new-f', studentId: null, studentName: null }))
      await waitFor(() => expect((input as HTMLInputElement).value).toBe(''))
    })

    it('keeps the typed text and shows an inline error when the save fails', async () => {
      mockCreate.mockRejectedValue(new Error('network error'))
      wrap({ followups: [] })
      const input = screen.getByTestId('general-note-input') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'Nota importante' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      await waitFor(() => expect(screen.getByTestId('general-note-error')).toBeInTheDocument())
      expect(input.value).toBe('Nota importante')
    })

    it('a general note has no student chip and no student link', () => {
      const followups = [makeFollowup({ id: 'f1', studentId: null, studentName: null, text: 'Nota general' })]
      wrap({ followups })
      expect(screen.getByText('Nota general')).toBeInTheDocument()
      expect(screen.queryByTestId('followup-student-link-f1')).not.toBeInTheDocument()
      expect(screen.queryByTestId('followup-text-link-f1')).not.toBeInTheDocument()
    })

    it('a general note between two followups for the same student does not break chip grouping', () => {
      const followups = [
        makeFollowup({ id: 'f1', studentId: 'student-1', studentName: 'Ana García', text: 'Todo A' }),
        makeFollowup({ id: 'f2', studentId: null, studentName: null, text: 'Nota general' }),
        makeFollowup({ id: 'f3', studentId: 'student-1', studentName: 'Ana García', text: 'Todo B' }),
      ]
      wrap({ followups })
      expect(screen.getByTestId('followup-student-link-f1')).toBeInTheDocument()
      expect(screen.queryByTestId('followup-student-link-f2')).not.toBeInTheDocument()
      expect(screen.getByTestId('followup-student-link-f3')).toBeInTheDocument()
    })
  })
})
