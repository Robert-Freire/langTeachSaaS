import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { UnscheduledDrafts } from './UnscheduledDrafts'
import type { Lesson } from '../../api/lessons'

function makeDraft(overrides: Partial<Lesson> = {}, idx = 0): Lesson {
  return {
    id: overrides.id ?? `d${idx}`,
    title: overrides.title ?? `Draft ${idx}`,
    language: 'English',
    cefrLevel: overrides.cefrLevel ?? 'B1',
    topic: 'Test',
    durationMinutes: 60,
    objectives: null,
    status: 'Draft',
    studentId: null,
    templateId: null,
    sections: [],
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-10T10:00:00Z',
    scheduledAt: null,
    studentName: null,
    ...overrides,
  }
}

function renderComponent(lessons: Lesson[]) {
  return render(
    <MemoryRouter>
      <UnscheduledDrafts lessons={lessons} />
    </MemoryRouter>,
  )
}

describe('UnscheduledDrafts', () => {
  it('renders nothing when no unscheduled drafts exist', () => {
    const { container } = renderComponent([])
    expect(container.firstChild).toBeNull()
  })

  it('shows lesson count in header', () => {
    const drafts = Array.from({ length: 3 }, (_, i) => makeDraft({}, i))
    renderComponent(drafts)
    expect(screen.getByText('Unscheduled Lessons (3)')).toBeInTheDocument()
  })

  it('does not show "Open" text in rows', () => {
    renderComponent([makeDraft()])
    expect(screen.queryByText('Open')).not.toBeInTheDocument()
  })

  it('applies CEFR color classes to badges', () => {
    renderComponent([makeDraft({ cefrLevel: 'A1' })])
    const badge = screen.getByText('A1')
    expect(badge.className).toContain('emerald')
  })

  it('shows only first 5 items and a "Show all" button when more than 5 drafts', () => {
    const drafts = Array.from({ length: 8 }, (_, i) => makeDraft({ id: `d${i}`, title: `Draft ${i}` }, i))
    renderComponent(drafts)

    // Should show 5 visible items
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`unscheduled-d${i}`)).toBeInTheDocument()
    }
    // 6th item should not be visible
    expect(screen.queryByTestId('unscheduled-d5')).not.toBeInTheDocument()

    // Show all button present
    expect(screen.getByTestId('show-all-drafts')).toBeInTheDocument()
    expect(screen.getByText('Show all (8)')).toBeInTheDocument()
  })

  it('shows all items after clicking "Show all"', async () => {
    const user = userEvent.setup()
    const drafts = Array.from({ length: 8 }, (_, i) => makeDraft({ id: `d${i}` }, i))
    renderComponent(drafts)

    await user.click(screen.getByTestId('show-all-drafts'))

    // All 8 items should now be visible
    for (let i = 0; i < 8; i++) {
      expect(screen.getByTestId(`unscheduled-d${i}`)).toBeInTheDocument()
    }
    // Show all button should be gone
    expect(screen.queryByTestId('show-all-drafts')).not.toBeInTheDocument()
  })

  it('shows all items directly when 5 or fewer drafts', () => {
    const drafts = Array.from({ length: 4 }, (_, i) => makeDraft({ id: `d${i}` }, i))
    renderComponent(drafts)

    for (let i = 0; i < 4; i++) {
      expect(screen.getByTestId(`unscheduled-d${i}`)).toBeInTheDocument()
    }
    expect(screen.queryByTestId('show-all-drafts')).not.toBeInTheDocument()
  })

  it('shows published unscheduled lessons with a Published badge', () => {
    const published = makeDraft({ id: 'p1', title: 'Ready Lesson', status: 'Published', scheduledAt: null })
    renderComponent([published])
    expect(screen.getByTestId('unscheduled-p1')).toBeInTheDocument()
    expect(screen.getByText('Published')).toBeInTheDocument()
  })

  it('excludes published lessons that are already scheduled', () => {
    const scheduled = makeDraft({ id: 'p2', status: 'Published', scheduledAt: '2026-03-20T10:00:00Z' })
    renderComponent([scheduled])
    expect(screen.queryByTestId('unscheduled-p2')).not.toBeInTheDocument()
  })
})
