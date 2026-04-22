import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CefrBadge } from './CefrBadge'

describe('CefrBadge', () => {
  it('renders the level text', () => {
    render(<CefrBadge level="B2" />)
    expect(screen.getByText('B2')).toBeInTheDocument()
  })

  it('applies A-level blue styling', () => {
    const { container } = render(<CefrBadge level="A1" />)
    expect(container.firstChild).toHaveClass('bg-[#DDE8F5]', 'text-[#1A4B7A]')
  })

  it('applies B-level indigo styling', () => {
    const { container } = render(<CefrBadge level="B2" />)
    expect(container.firstChild).toHaveClass('bg-[#ECEAFD]', 'text-[#3525CD]')
  })

  it('applies C-level warm styling', () => {
    const { container } = render(<CefrBadge level="C1" />)
    expect(container.firstChild).toHaveClass('bg-[#F8E9D6]', 'text-[#7E3000]')
  })

  it('forwards data-testid to the span', () => {
    render(<CefrBadge level="B1" data-testid="my-badge" />)
    expect(screen.getByTestId('my-badge')).toBeInTheDocument()
  })
})
