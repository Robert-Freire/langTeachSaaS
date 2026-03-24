import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { WeekStrip } from './WeekStrip'

vi.mock('./SchedulePopover', () => ({
  SchedulePopover: () => null,
}))

const scrollIntoViewMock = vi.fn()
const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView

beforeEach(() => {
  scrollIntoViewMock.mockClear()
  window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock
})

afterEach(() => {
  window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView
  vi.restoreAllMocks()
})

function renderWeekStrip(weekOffset = 0) {
  return render(
    <MemoryRouter>
      <WeekStrip
        weekOffset={weekOffset}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        lessons={[]}
        students={[]}
        unscheduledDrafts={[]}
      />
    </MemoryRouter>
  )
}

describe('WeekStrip', () => {
  it('renders 7 day columns', () => {
    renderWeekStrip()
    for (let i = 0; i < 7; i++) {
      expect(screen.getByTestId(`week-day-${i}`)).toBeInTheDocument()
    }
  })

  it('auto-scrolls today column into view when weekOffset is 0', () => {
    renderWeekStrip(0)
    // scrollIntoView should be called once for today's column
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1)
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  })

  it('does not auto-scroll when weekOffset is non-zero', () => {
    renderWeekStrip(1)
    expect(scrollIntoViewMock).not.toHaveBeenCalled()
  })
})
