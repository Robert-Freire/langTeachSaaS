import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkedUpText } from './MarkedUpText'
import type { CorrectionTagDto } from '@/types/correction'

function tag(over: Partial<CorrectionTagDto>): CorrectionTagDto {
  return {
    category: 'G',
    spannedText: '',
    startIndex: 0,
    endIndex: 0,
    explanation: null,
    correctedForm: null,
    orderIndex: 0,
    ...over,
  }
}

describe('MarkedUpText', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('renders plain text when there are no tags', () => {
    render(<MarkedUpText studentText="Hola mundo." tags={[]} />)
    expect(screen.getByTestId('marked-up-text')).toHaveTextContent('Hola mundo.')
  })

  it('renders MuyBien spans bold without a chip', () => {
    render(
      <MarkedUpText
        studentText="Hola Lucía."
        tags={[tag({ category: 'MuyBien', startIndex: 5, endIndex: 10, spannedText: 'Lucía' })]}
      />,
    )
    const strong = screen.getByText('Lucía')
    expect(strong.tagName).toBe('STRONG')
    expect(screen.queryByText('M')).not.toBeInTheDocument()
  })

  it('renders C/G/L/O spans with category chip', () => {
    render(
      <MarkedUpText
        studentText="Ayer voy."
        tags={[tag({ category: 'G', startIndex: 5, endIndex: 8, spannedText: 'voy', explanation: 'pasado', correctedForm: 'fui' })]}
      />,
    )
    expect(screen.getByText('voy')).toBeInTheDocument()
    expect(screen.getByText('G')).toBeInTheDocument()
  })

  it('drops out-of-bounds tag indices and warns', () => {
    render(
      <MarkedUpText
        studentText="abc"
        tags={[tag({ category: 'L', startIndex: 1, endIndex: 99, spannedText: 'bc' })]}
      />,
    )
    expect(screen.getByTestId('marked-up-text')).toHaveTextContent('abc')
    expect(console.warn).toHaveBeenCalled()
  })

  it('drops zero-width tag', () => {
    render(
      <MarkedUpText
        studentText="abc"
        tags={[tag({ category: 'L', startIndex: 1, endIndex: 1, spannedText: '' })]}
      />,
    )
    expect(console.warn).toHaveBeenCalled()
  })

  it('renders overlapping tag as a footnote', () => {
    render(
      <MarkedUpText
        studentText="abcdef"
        tags={[
          tag({ category: 'G', startIndex: 0, endIndex: 4, spannedText: 'abcd', explanation: 'one', correctedForm: 'A' }),
          tag({ category: 'L', startIndex: 2, endIndex: 5, spannedText: 'cde', explanation: 'two', correctedForm: 'C' }),
        ]}
      />,
    )
    expect(screen.getByText(/Notas adicionales/i)).toBeInTheDocument()
    expect(screen.getByText(/"cde"/)).toBeInTheDocument()
  })

  it('preserves paragraph breaks', () => {
    render(<MarkedUpText studentText={'Para uno.\n\nPara dos.'} tags={[]} />)
    const node = screen.getByTestId('marked-up-text')
    expect(node).toHaveTextContent(/Para uno/)
    expect(node).toHaveTextContent(/Para dos/)
  })
})
