import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { PageHeader } from './PageHeader'

function renderHeader(props: Parameters<typeof PageHeader>[0]) {
  return render(
    <MemoryRouter>
      <PageHeader {...props} />
    </MemoryRouter>
  )
}

describe('PageHeader', () => {
  it('renders title', () => {
    renderHeader({ title: 'Students' })
    expect(screen.getByRole('heading', { name: 'Students' })).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    renderHeader({ title: 'Students', subtitle: 'Manage profiles.' })
    expect(screen.getByText('Manage profiles.')).toBeInTheDocument()
  })

  it('does not render subtitle when omitted', () => {
    renderHeader({ title: 'Students' })
    expect(screen.queryByText(/manage/i)).not.toBeInTheDocument()
  })

  it('renders back link when backTo is provided', () => {
    renderHeader({ title: 'Edit Student', backTo: '/students', backLabel: 'Students' })
    const back = screen.getByTestId('page-header-back')
    expect(back).toBeInTheDocument()
    expect(back).toHaveTextContent('Students')
    expect(back).toHaveAttribute('href', '/students')
  })

  it('omits back link when backTo is not provided', () => {
    renderHeader({ title: 'Students' })
    expect(screen.queryByTestId('page-header-back')).not.toBeInTheDocument()
  })

  it('renders actions slot', () => {
    renderHeader({
      title: 'Settings',
      actions: <button>Save</button>,
    })
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})
