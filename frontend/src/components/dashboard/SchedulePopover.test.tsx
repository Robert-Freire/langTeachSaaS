import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { SchedulePopover } from './SchedulePopover'
import type { Lesson } from '../../api/lessons'
import type { Student } from '../../api/students'

const mockUpdateLesson = vi.fn()
vi.mock('../../api/lessons', () => ({
  updateLesson: (...args: unknown[]) => mockUpdateLesson(...args),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockStudents: Student[] = [
  { id: 's1', name: 'Alice', learningLanguage: 'English', cefrLevel: 'B1', interests: [], notes: null, nativeLanguage: null, learningGoals: [], weaknesses: [], difficulties: [], createdAt: '', updatedAt: '' },
  { id: 's2', name: 'Bob', learningLanguage: 'Spanish', cefrLevel: 'A2', interests: [], notes: null, nativeLanguage: null, learningGoals: [], weaknesses: [], difficulties: [], createdAt: '', updatedAt: '' },
]

function makeDraft(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: overrides.id ?? 'draft-1',
    title: overrides.title ?? 'Draft Lesson',
    language: overrides.language ?? 'English',
    cefrLevel: overrides.cefrLevel ?? 'B1',
    topic: overrides.topic ?? 'Grammar',
    durationMinutes: 60,
    objectives: null,
    status: 'Draft',
    studentId: overrides.studentId ?? null,
    templateId: null,
    sections: [],
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-10T10:00:00Z',
    scheduledAt: null,
    studentName: overrides.studentName ?? null,
  }
}

const testDate = new Date(2026, 2, 18) // March 18, 2026

function renderPopover(props?: { drafts?: Lesson[]; students?: Student[] }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SchedulePopover
          date={testDate}
          students={props?.students ?? mockStudents}
          unscheduledDrafts={props?.drafts ?? [makeDraft()]}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SchedulePopover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateLesson.mockResolvedValue({ id: 'draft-1' })
  })

  it('renders the + trigger button', () => {
    renderPopover()
    expect(screen.getByTestId('schedule-popover-trigger')).toBeInTheDocument()
  })

  it('opens popover on click with student select and time input', async () => {
    renderPopover()
    await userEvent.click(screen.getByTestId('schedule-popover-trigger'))
    expect(await screen.findByTestId('schedule-popover-main')).toBeInTheDocument()
    expect(screen.getByTestId('schedule-student-select')).toBeInTheDocument()
    expect(screen.getByTestId('schedule-time-input')).toBeInTheDocument()
  })

  it('navigates with correct query params on Create New Lesson', async () => {
    renderPopover()
    await userEvent.click(screen.getByTestId('schedule-popover-trigger'))
    await screen.findByTestId('schedule-popover-main')
    await userEvent.click(screen.getByTestId('schedule-create-new'))
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/lessons/new?scheduledAt=2026-03-18T10%3A00')
    )
  })

  it('shows Assign Existing Draft button when drafts exist', async () => {
    renderPopover()
    await userEvent.click(screen.getByTestId('schedule-popover-trigger'))
    await screen.findByTestId('schedule-popover-main')
    expect(screen.getByTestId('schedule-assign-draft')).toBeInTheDocument()
  })

  it('hides Assign Existing Draft button when no drafts', async () => {
    renderPopover({ drafts: [] })
    await userEvent.click(screen.getByTestId('schedule-popover-trigger'))
    await screen.findByTestId('schedule-popover-main')
    expect(screen.queryByTestId('schedule-assign-draft')).not.toBeInTheDocument()
  })

  it('switches to drafts view and shows drafts', async () => {
    renderPopover()
    await userEvent.click(screen.getByTestId('schedule-popover-trigger'))
    await screen.findByTestId('schedule-popover-main')
    await userEvent.click(screen.getByTestId('schedule-assign-draft'))
    expect(await screen.findByTestId('schedule-popover-drafts')).toBeInTheDocument()
    expect(screen.getByTestId('schedule-draft-draft-1')).toBeInTheDocument()
  })

  it('calls updateLesson when clicking a draft', async () => {
    renderPopover()
    await userEvent.click(screen.getByTestId('schedule-popover-trigger'))
    await screen.findByTestId('schedule-popover-main')
    await userEvent.click(screen.getByTestId('schedule-assign-draft'))
    await screen.findByTestId('schedule-popover-drafts')
    await userEvent.click(screen.getByTestId('schedule-draft-draft-1'))
    await waitFor(() => {
      expect(mockUpdateLesson).toHaveBeenCalledWith('draft-1', {
        title: 'Draft Lesson',
        language: 'English',
        cefrLevel: 'B1',
        topic: 'Grammar',
        scheduledAt: '2026-03-18T10:00',
        studentId: null,
      })
    })
  })

  it('filters drafts by selected student (includes unassigned)', async () => {
    const drafts = [
      makeDraft({ id: 'draft-s1', studentId: 's1', title: 'Alice Draft' }),
      makeDraft({ id: 'draft-s2', studentId: 's2', title: 'Bob Draft' }),
      makeDraft({ id: 'draft-none', studentId: null, title: 'Unassigned Draft' }),
    ]
    renderPopover({ drafts })
    await userEvent.click(screen.getByTestId('schedule-popover-trigger'))
    await screen.findByTestId('schedule-popover-main')

    // Select Alice
    await userEvent.click(screen.getByTestId('schedule-student-select'))
    const aliceOption = await screen.findByRole('option', { name: 'Alice' })
    await userEvent.click(aliceOption)

    // Switch to drafts view
    await userEvent.click(screen.getByTestId('schedule-assign-draft'))
    await screen.findByTestId('schedule-popover-drafts')

    // Alice's draft and unassigned drafts show, Bob's does not
    expect(screen.getByTestId('schedule-draft-draft-s1')).toBeInTheDocument()
    expect(screen.getByTestId('schedule-draft-draft-none')).toBeInTheDocument()
    expect(screen.queryByTestId('schedule-draft-draft-s2')).not.toBeInTheDocument()
  })

  it('navigates back from drafts view', async () => {
    renderPopover()
    await userEvent.click(screen.getByTestId('schedule-popover-trigger'))
    await screen.findByTestId('schedule-popover-main')
    await userEvent.click(screen.getByTestId('schedule-assign-draft'))
    await screen.findByTestId('schedule-popover-drafts')
    await userEvent.click(screen.getByTestId('schedule-drafts-back'))
    expect(await screen.findByTestId('schedule-popover-main')).toBeInTheDocument()
  })
})
