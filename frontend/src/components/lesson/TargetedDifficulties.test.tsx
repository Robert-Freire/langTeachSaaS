import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TargetedDifficulties } from './TargetedDifficulties'

describe('TargetedDifficulties', () => {
  it('renders badges from generationParams JSON', () => {
    const params = JSON.stringify({
      targetedDifficulties: [
        { category: 'grammar', item: 'ser/estar in past tense', severity: 'high' },
        { category: 'vocabulary', item: 'false cognates', severity: 'medium' },
      ],
    })

    render(<TargetedDifficulties generationParams={params} />)

    const badges = screen.getAllByTestId('difficulty-badge')
    expect(badges).toHaveLength(2)
    expect(badges[0]).toHaveTextContent('[grammar]')
    expect(badges[0]).toHaveTextContent('ser/estar in past tense')
    expect(badges[1]).toHaveTextContent('[vocabulary]')
    expect(badges[1]).toHaveTextContent('false cognates')
  })

  it('renders badges from difficulties prop directly', () => {
    const difficulties = [
      { category: 'pronunciation', item: 'vowel reduction', severity: 'low' },
    ]

    render(<TargetedDifficulties difficulties={difficulties} />)

    const badges = screen.getAllByTestId('difficulty-badge')
    expect(badges).toHaveLength(1)
    expect(badges[0]).toHaveTextContent('[pronunciation]')
    expect(badges[0]).toHaveTextContent('vowel reduction')
  })

  it('applies correct severity colors', () => {
    const params = JSON.stringify({
      targetedDifficulties: [
        { category: 'grammar', item: 'high item', severity: 'high' },
        { category: 'vocab', item: 'medium item', severity: 'medium' },
        { category: 'pron', item: 'low item', severity: 'low' },
      ],
    })

    render(<TargetedDifficulties generationParams={params} />)

    const badges = screen.getAllByTestId('difficulty-badge')
    expect(badges[0].className).toContain('bg-red-50')
    expect(badges[1].className).toContain('bg-amber-50')
    expect(badges[2].className).toContain('bg-blue-50')
  })

  it('returns null when generationParams is null', () => {
    const { container } = render(<TargetedDifficulties generationParams={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when generationParams has no targetedDifficulties', () => {
    const params = JSON.stringify({ lessonId: 'abc' })
    const { container } = render(<TargetedDifficulties generationParams={params} />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when targetedDifficulties is empty array', () => {
    const params = JSON.stringify({ targetedDifficulties: [] })
    const { container } = render(<TargetedDifficulties generationParams={params} />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when generationParams is invalid JSON', () => {
    const { container } = render(<TargetedDifficulties generationParams="not json" />)
    expect(container.innerHTML).toBe('')
  })
})
