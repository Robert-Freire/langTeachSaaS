import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TargetedDifficulties } from './TargetedDifficulties'

describe('TargetedDifficulties', () => {
  it('renders badges from generationParams JSON', () => {
    const params = JSON.stringify({
      targetedDifficulties: [
        { competency: 'Grammar', description: 'Confuses ser/estar in past tense', severity: 'high' },
        { competency: 'Vocabulary', description: 'False cognates with English', severity: 'medium' },
      ],
    })

    render(<TargetedDifficulties generationParams={params} />)

    const badges = screen.getAllByTestId('difficulty-badge')
    expect(badges).toHaveLength(2)
    expect(badges[0]).toHaveTextContent('[Grammar]')
    expect(badges[0]).toHaveTextContent('Confuses ser/estar in past tense')
    expect(badges[1]).toHaveTextContent('[Vocabulary]')
    expect(badges[1]).toHaveTextContent('False cognates with English')
  })

  it('renders badges from difficulties prop directly', () => {
    const difficulties = [
      { competency: 'Pronunciation', description: 'Vowel quality reduction', severity: 'low' },
    ]

    render(<TargetedDifficulties difficulties={difficulties} />)

    const badges = screen.getAllByTestId('difficulty-badge')
    expect(badges).toHaveLength(1)
    expect(badges[0]).toHaveTextContent('[Pronunciation]')
    expect(badges[0]).toHaveTextContent('Vowel quality reduction')
  })

  it('applies correct severity colors', () => {
    const params = JSON.stringify({
      targetedDifficulties: [
        { competency: 'Grammar', description: 'high item', severity: 'high' },
        { competency: 'Vocabulary', description: 'medium item', severity: 'medium' },
        { competency: 'Pronunciation', description: 'low item', severity: 'low' },
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
