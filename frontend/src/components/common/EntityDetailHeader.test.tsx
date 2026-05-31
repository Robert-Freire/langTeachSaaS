import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { EntityDetailHeader } from './EntityDetailHeader'

function renderHeader(props: Partial<Parameters<typeof EntityDetailHeader>[0]> = {}) {
  return render(
    <MemoryRouter>
      <EntityDetailHeader
        backTo="/list"
        avatar={<div data-testid="avatar-slot" />}
        title="Test Entity"
        actions={<button>Action</button>}
        {...props}
      />
    </MemoryRouter>
  )
}

describe('EntityDetailHeader', () => {
  it('renders title', () => {
    renderHeader()
    expect(screen.getByText('Test Entity')).toBeInTheDocument()
  })

  it('renders titleTestId on h1', () => {
    renderHeader({ titleTestId: 'entity-name' })
    expect(screen.getByTestId('entity-name')).toHaveTextContent('Test Entity')
  })

  it('renders back link with correct href', () => {
    renderHeader({ backTo: '/groups', backLabel: 'Back to groups' })
    const link = screen.getByRole('link', { name: 'Back to groups' })
    expect(link).toHaveAttribute('href', '/groups')
  })

  it('renders avatar slot', () => {
    renderHeader()
    expect(screen.getByTestId('avatar-slot')).toBeInTheDocument()
  })

  it('renders actions slot', () => {
    renderHeader({ actions: <button data-testid="action-btn">Go</button> })
    expect(screen.getByTestId('action-btn')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    renderHeader({ subtitle: 'B1 group, 3 students' })
    expect(screen.getByText('B1 group, 3 students')).toBeInTheDocument()
  })

  it('does not render subtitle paragraph when omitted', () => {
    const { container } = renderHeader({ subtitle: undefined })
    expect(container.querySelector('p')).not.toBeInTheDocument()
  })

  it('renders cefrBadge when provided', () => {
    renderHeader({ cefrBadge: <span data-testid="cefr-badge">B1</span> })
    expect(screen.getByTestId('cefr-badge')).toBeInTheDocument()
  })

  it('renders badges slot when provided', () => {
    renderHeader({ badges: <span data-testid="status-badge">Active</span> })
    expect(screen.getByTestId('status-badge')).toBeInTheDocument()
  })

  it('renders meta slot when provided', () => {
    renderHeader({ meta: <span data-testid="meta-slot">Every week</span> })
    expect(screen.getByTestId('meta-slot')).toBeInTheDocument()
  })

  it('applies data-testid to container', () => {
    renderHeader({ 'data-testid': 'entity-header' })
    expect(screen.getByTestId('entity-header')).toBeInTheDocument()
  })

  it('uses shadow-card class for floating card appearance', () => {
    renderHeader({ 'data-testid': 'entity-header' })
    expect(screen.getByTestId('entity-header')).toHaveClass('shadow-card')
  })
})
