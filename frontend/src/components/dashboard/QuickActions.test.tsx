import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QuickActions } from './QuickActions'

function renderComponent(props = {}) {
  return render(
    <MemoryRouter>
      <QuickActions studentCount={5} weekLessonCount={3} totalLessonCount={12} {...props} />
    </MemoryRouter>,
  )
}

describe('QuickActions', () => {
  it('displays stat values', () => {
    renderComponent()
    expect(screen.getByTestId('stat-students')).toHaveTextContent('5')
    expect(screen.getByTestId('stat-week-lessons')).toHaveTextContent('3')
    expect(screen.getByTestId('stat-total-lessons')).toHaveTextContent('12')
  })

  it('renders stat boxes with brand accent colors', () => {
    const { container } = renderComponent()
    const statBoxes = container.querySelectorAll('.border-l-indigo-400')
    expect(statBoxes.length).toBe(3)
  })

  it('renders stat icons with indigo color', () => {
    const { container } = renderComponent()
    const icons = container.querySelectorAll('.text-indigo-500')
    expect(icons.length).toBe(3)
  })

  it('renders New Lesson button', () => {
    renderComponent()
    expect(screen.getByTestId('new-lesson-btn')).toHaveTextContent('New Lesson')
  })
})
