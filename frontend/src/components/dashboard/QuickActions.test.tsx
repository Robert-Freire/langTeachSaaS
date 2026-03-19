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

  it('renders stat icons with indigo color', () => {
    const { container } = renderComponent()
    const icons = container.querySelectorAll('.text-indigo-500')
    expect(icons.length).toBe(3)
  })

  it('renders New Lesson button', () => {
    renderComponent()
    expect(screen.getByTestId('new-lesson-btn')).toHaveTextContent('New Lesson')
  })

  it('renders New Student button with outline style', () => {
    renderComponent()
    const btn = screen.getByTestId('new-student-btn')
    expect(btn).toHaveTextContent('New Student')
    expect(btn.className).toContain('border-indigo-600')
  })

  it('links New Lesson to /lessons/new', () => {
    renderComponent()
    const btn = screen.getByTestId('new-lesson-btn')
    const link = btn.closest('a')
    expect(link).toHaveAttribute('href', '/lessons/new')
  })

  it('links New Student to /students/new', () => {
    renderComponent()
    const btn = screen.getByTestId('new-student-btn')
    const link = btn.closest('a')
    expect(link).toHaveAttribute('href', '/students/new')
  })

  it('renders clickable stat rows linking to correct routes', () => {
    renderComponent()
    expect(screen.getByTestId('stat-link-students')).toHaveAttribute('href', '/students')
    expect(screen.getByTestId('stat-link-week')).toHaveAttribute('href', '/lessons')
    expect(screen.getByTestId('stat-link-total')).toHaveAttribute('href', '/lessons')
  })

  it('renders stat rows with hover styling', () => {
    renderComponent()
    const statLink = screen.getByTestId('stat-link-students')
    expect(statLink.className).toContain('hover:bg-indigo-50')
  })
})
