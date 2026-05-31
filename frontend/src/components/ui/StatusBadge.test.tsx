import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders Active label for active variant', () => {
    render(<StatusBadge variant="active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders Inactive label for inactive variant', () => {
    render(<StatusBadge variant="inactive" />)
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('renders Private label for private variant', () => {
    render(<StatusBadge variant="private" />)
    expect(screen.getByText('Private')).toBeInTheDocument()
  })

  it('renders Corporate label for corporate variant', () => {
    render(<StatusBadge variant="corporate" />)
    expect(screen.getByText('Corporate')).toBeInTheDocument()
  })

  it('applies rounded-md class (square badge)', () => {
    render(<StatusBadge variant="active" data-testid="badge" />)
    expect(screen.getByTestId('badge')).toHaveClass('rounded-md')
  })

  it('forwards data-testid prop', () => {
    render(<StatusBadge variant="active" data-testid="active-pill" />)
    expect(screen.getByTestId('active-pill')).toBeInTheDocument()
  })

  it('applies active green colors', () => {
    render(<StatusBadge variant="active" data-testid="badge" />)
    expect(screen.getByTestId('badge')).toHaveClass('bg-green-100', 'text-green-700')
  })

  it('applies inactive zinc colors', () => {
    render(<StatusBadge variant="inactive" data-testid="badge" />)
    expect(screen.getByTestId('badge')).toHaveClass('bg-zinc-100', 'text-zinc-500')
  })
})
