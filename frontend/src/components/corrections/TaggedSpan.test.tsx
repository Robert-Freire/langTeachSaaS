import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaggedSpan } from './TaggedSpan'
import type { CorrectionTag } from '@/api/corrections'

const baseTag: CorrectionTag = {
  category: 'G',
  spannedText: 'voy',
  startIndex: 0,
  endIndex: 3,
  explanation: 'Era pasado',
  correctedForm: 'fui',
  orderIndex: 0,
  filterStatus: 'kept',
}

describe('TaggedSpan', () => {
  it('renders the chip letter for the category', () => {
    render(<TaggedSpan tag={{ ...baseTag, category: 'L' }} text="voy" />)
    expect(screen.getByText('L')).toBeInTheDocument()
  })

  it('opens a popover with explanation and corrected form on click', () => {
    render(<TaggedSpan tag={baseTag} text="voy" />)
    const trigger = screen.getByRole('button', { name: /Marca de Gramática/ })
    fireEvent.click(trigger)
    expect(screen.getByText('Era pasado')).toBeInTheDocument()
    expect(screen.getByText(/Forma corregida/i)).toBeInTheDocument()
    expect(screen.getByText('fui')).toBeInTheDocument()
  })

  it('uses Spanish category labels for ARIA', () => {
    render(<TaggedSpan tag={{ ...baseTag, category: 'O' }} text="Era" />)
    expect(screen.getByRole('button', { name: /Ortografía/ })).toBeInTheDocument()
  })

  it('marks above-level errors distinctly (dashed underline + ARIA + badge)', () => {
    render(<TaggedSpan tag={{ ...baseTag, filterStatus: 'removed' }} text="voy" />)
    const trigger = screen.getByRole('button', { name: /por encima del nivel/i })
    expect(trigger.className).toContain('decoration-dashed')
    fireEvent.click(trigger)
    expect(screen.getByText(/Por encima del nivel/i)).toBeInTheDocument()
  })
})
